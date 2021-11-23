require('dotenv').config({path: __dirname + '/../../../../.env'});
const fs = require('fs');
const path = require('path');
const program = require('commander');
const parse = require('csv-parse');
const transform = require('stream-transform');
const stringify = require('csv-stringify');
const moment = require('moment');
const custom_log = require(path.join(process.env.bic_etl_home, 'general/scripts/custom_log.js'));
const orr = require(path.join(process.env.bic_etl_home, 'cdos/business/nonprofit/scripts/orr.js'));
const orrCity = new orr({"state": "CO", "rulesPath": path.join(process.env.bic_etl_home, 'cdos/business/business/scripts/rules', 'rules-tradenames-city.txt')});
const orrMailingCity = new orr({"state": "CO", "rulesPath": path.join(process.env.bic_etl_home, 'cdos/business/business/scripts/rules', 'rules-tradenames-mailingcity.txt')});
const custom_helper = require(path.join(process.env.bic_etl_home, 'cdos', 'business', 'nonprofit', 'scripts', 'helper_transform_functions.js'));

program
	.option('-t, --title <n>', 'Dataset Title')
	.option('-f, --folderpath <n>', 'File path')
	.option('-e, --ext <n>', '.txt')
	.parse(process.argv);

program.title = (program.title) ? program.title : 'Trademarks';
let log = {};
custom_log.setup(program.title, function(custom_logger) {
  log = custom_logger;
  try {
    initiate();
  } catch(e) {
    log.error("Unhandled error: " + e);
    process.exit();
  }
});

let tradename_form_list = {};

function initiate() {
	let ext = (program.ext) ? program.ext : '.txt';
	let filepath = (program.folderpath) ? program.folderpath : path.join(process.env.bic_etl_home, 'cdos', 'business', 'business', 'data_source', 'tradenames.tsv');;
	filepath = path.resolve(filepath);

	let outfile = path.join(process.env.bic_etl_home, 'cdos', 'business', 'business', 'data_transformed', 'tradenames.csv');
	let tradename_form_file = path.join(process.env.bic_etl_home, 'cdos', 'business', 'business', 'scripts', 'rules', 'tradename_form.csv');

	if (!fs.existsSync(filepath)) {
		log.warn("Folder does not does not exist to load CSV files for analysis: " + filepath);
		process.exit(0);
	}

	let input_stream = fs.createReadStream(tradename_form_file)
	.on('error', error_handler);
	//Parse input
	let tradename_form_parser = parse({
			delimiter: ",",
			columns: true
	}).on('readable', function(){
		let record
		while (record = this.read()) {
			tradename_form_list[record['key']] = record['value'];
		}
	}).on('end', function() {
		transform_tradenames(filepath, outfile); // Executes the processing
	})
	input_stream.pipe(tradename_form_parser);
}

let header_columns = [
    "masterTradenameId",
    "tradenameDescription",
    "tradenameForm",
    "effectiveDate",
    "firstName",
    "middleName",
    "lastName",
    "suffix",
    "registrantOrganization",
    "address1",
    "address2",
    "city",
    "state",
    "zipCode",
    "zipCode4",
    "country",
    "mailingAddress1",
    "mailingAddress2",
    "mailingCity",
    "mailingState",
    "mailingZipCode",
    "mailingZipCode4",
    "mailingCountry",
    "dateAdded",
    "entityStatus",
    "entityFormDate"
];

/*
 - camel case
 - changed dates to ISO
 - fixed up-case on names and cities
 - added zip4 columns for zip and mailing zip
*/
function transformation(row) {
	let tRow = {};

	let tradename_id_key = 'Mstr Trdnm Id';
	for(let key in row) {
		if(key.indexOf(tradename_id_key) > -1) {
			tradename_id_key = key;
		}
	}

  let entityDateParts = row["Entity Form Date"].split('/');
  let dateStr = entityDateParts[2] + '-' + entityDateParts[0] + '-' + entityDateParts[1];
  if(dateStr.search(/undefined/gi) != -1) {
		dateStr = '';
  }

  tRow["entityStatus"] 	   = row["Entity Status"];
  tRow["entityFormDate"] 	   = dateStr
  tRow["masterTradenameId"]      = row[tradename_id_key].replace('\n', '');
  tRow["tradenameDescription"]   = row["Trdnm Dscr"];
  tRow["tradenameForm"]          = (row["Tradename Form"]) ? tradename_form_list[row["Tradename Form"]] : '';
  tRow["effectiveDate"]          = moment(row["Add Dtm"], 'MM/DD/YYYY').format('YYYY-MM-DD');
  tRow["firstName"]              = (row["First Nm"]) ? custom_helper.fixCap(row["First Nm"]) : '';
  tRow["middleName"]             = (row["Middle Nm"]) ? custom_helper.fixCap(row["Middle Nm"]) : '';
  tRow["lastName"]               = (row["Last Nm"]) ? custom_helper.fixCap(row["Last Nm"]) : '';
  tRow["suffix"]                 = (row["Suffix"]) ? custom_helper.fixCap(row["Suffix"]) : '';
  tRow["registrantOrganization"] = row["Registrant Organization"];
  tRow["address1"]               = row["Address1"];
  tRow["address2"]               = row["Address2"];
  tRow["city"]                   = (row["City"]) ? orrCity.resolve(custom_helper.fixCap(row["City"])) : '';
  tRow["state"]                  = row["State"];
  tRow["zipCode"]                = custom_helper.getZipBase(row["Zip Code"]);
  tRow["zipCode4"]               = custom_helper.getZip4(row["Zip Code"]);
  tRow["country"]                = row["Country"];
  tRow["mailingAddress1"]        = row["Mailing Address1"];
  tRow["mailingAddress2"]        = row["Mailing Address 2"];
  tRow["mailingCity"]            = orrMailingCity.resolve( row["Mailing City"] );
  tRow["mailingState"]           = row["Mailing State"];
  tRow["mailingZipCode"]         = custom_helper.getZipBase(row["Mailing Zip"]);
  tRow["mailingZipCode4"]        = custom_helper.getZip4(row["Mailing Zip"]);
  tRow["mailingCountry"]         = row["Mailing Country"];
  tRow["dateAdded"]              = moment(row["Add Dtm"], 'MM/DD/YYYY').format('YYYY-MM-DD');
  return tRow;
}

function error_handler(e) {
    log.error("Error mid-stream: " + e);
    setTimeout(function() {
      process.exit(1);
    }, 200);
}

/*
   This function will get the files to be transformed and perform the transform
*/
function transform_tradenames(file_path, outfile) {
  log.debug("Files to be transformed: " + file_path);
  //Original file
  let input_stream = fs.createReadStream(file_path)
  .on('error', error_handler);
  //Transformed file
	let output_stream = fs.createWriteStream(outfile)
	.on('error', error_handler);
  //Parse input
  let tradenames_parser = parse({
      delimiter: "\t",
      columns: true
  })
  .on('error', error_handler);
  //Transform input
  let tradenames_transformer = transform(transformation)
  .on('error', error_handler);
  //New data to output
  let tradenames_stringifier = stringify({
      header: true,
      columns: header_columns
  })
  .on('error', error_handler);
  // Connect all streams
  input_stream.pipe(tradenames_parser).pipe(tradenames_transformer).pipe(tradenames_stringifier).pipe(output_stream);

  //Once complete
  output_stream.on('finish', function() {
      log.debug('All items have been processed, final file is at: '+ outfile);
  });
}