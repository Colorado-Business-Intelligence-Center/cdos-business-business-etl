require('dotenv').config({path: __dirname + '/../../../../.env'});
const fs = require('fs');
const path = require('path');
const program = require('commander');
const parse = require('csv-parse');
const transform = require('stream-transform');
const stringify = require('csv-stringify');
const custom_log = require(path.join(process.env.bic_etl_home, 'general/scripts/custom_log.js'));

program
	.option('-t, --title <n>', 'Dataset Title')
	.option('-f, --folderpath <n>', '/usr/local/cim/data/source/sos/trademarks/')
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

let trademark_form_list = {};

function initiate() {
	log.info("Program Started");

	let ext = (program.ext) ? program.ext : '.txt';
	let filepath = (program.folderpath) ? program.folderpath : path.join(process.env.bic_etl_home, 'cdos', 'business', 'business', 'data_source', 'trademarks.tsv');
	filepath = path.resolve(filepath);

	if (!fs.existsSync(filepath)) {
		log.warn("Folder does not does not exist to load CSV files for analysis: " + filepath);
		process.exit(0);
	}

	let outfile = path.join(process.env.bic_etl_home, 'cdos', 'business', 'business', 'data_transformed', 'trademarks.csv');
	let trademark_form_file = path.join(process.env.bic_etl_home, 'cdos', 'business', 'business', 'scripts', 'rules', 'trademark_form.csv');


	let input_stream = fs.createReadStream(trademark_form_file)
	.on('error', error_handler);
	//Parse input
	let trademark_form_parser = parse({
			delimiter: ",",
			columns: true
	}).on('readable', function(){
		let record
		while (record = this.read()) {
			trademark_form_list[record['key']] = record['value'];
		}
	}).on('end', function() {
		transform_trademarks(filepath, outfile); // Executes the processing
	})
	input_stream.pipe(trademark_form_parser);

}

var header_columns = [
    "masterTrademarkId",
    "entityId",
    "entityName",
    "status",
    "type",
    "registrationDate",
    "dateFirstUsed",
    "expirationDate",
    "goodServiceClass",
    "goodServiceDetail",
    "description",
    "trademarkForm",
    "entityStatus",
    "entityFormDate"
];

function date_format(date_string) {
	let date_parts = date_string.split('/');
	let new_date_str = date_parts[2] + '-' + date_parts[0] + '-' + date_parts[1]
	if(new_date_str.search(/undefined/gi) != -1) {
			new_date_str = '';
	}
	return new_date_str
}

/*
 - camel case
 - Trademark form map created
 - commented out the trademark status
 - Registrant Name changed to entityname
 - Trademark Description renamed to just description
 - entityName column moved next to entityid
*/
function transformation(row) {
	let trademark_id_key = "Master Trademark Id";
	for(let key in row) {
		if(key.indexOf(trademark_id_key) > -1) {
			trademark_id_key = key;
		}
	}

    var tRow = {};

    tRow["masterTrademarkId"] = row[trademark_id_key];
    tRow["entityId"] = row["Entity Id"];
    tRow["entityName"] = row["Registrant Name"];
    tRow["status"] = row["Trademark Status"];
    tRow["type"] = row["Trademark Type"];
    tRow["registrationDate"] = date_format(row["Registration Date"]);
    tRow["dateFirstUsed"] = date_format(row["Date of First Use"]);
    tRow["expirationDate"] = date_format(row["Expiration Date"]);
    tRow["goodServiceClass"] = row["Goods and Services Class"];
    tRow["goodServiceDetail"] = row["Goods and Services Detail"];
    tRow["description"] = row["Trademark Description"];
    tRow["trademarkForm"] = (row["Trademark Form"]) ? trademark_form_list[row["Trademark Form"]] : '';
    tRow["entityStatus"] = row["Entity Status"];
    tRow["entityFormDate"] = date_format(row["Entity Form Date"])
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
function transform_trademarks(file_path, outfile) {
  log.debug("Files to be transformed: " + file_path);
  //Original file
  let input_stream = fs.createReadStream(file_path)
  .on('error', error_handler);
  //Transformed file
	let output_stream = fs.createWriteStream(outfile)
	.on('error', error_handler);
  //Parse input
  let trademarks_parser = parse({
      delimiter: "\t",
      columns: true
  })
  .on('error', error_handler);
  //Transform input
  let trademarks_transformer = transform(transformation)
  .on('error', error_handler);
  //New data to output
  let trademarks_stringifier = stringify({
      header: true,
      columns: header_columns
  })
  .on('error', error_handler);
  // Connect all streams
  input_stream.pipe(trademarks_parser).pipe(trademarks_transformer).pipe(trademarks_stringifier).pipe(output_stream);

  //Once complete
  output_stream.on('finish', function() {
      log.debug('All items have been processed, final file is at: '+ outfile);
  });
}