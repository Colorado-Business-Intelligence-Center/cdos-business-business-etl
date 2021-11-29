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

function initiate() {
	log.info("Program Started");

	let filepath = (program.folderpath) ? program.folderpath : path.join(process.env.bic_etl_home, 'cdos', 'business', 'business', 'data_source', 'masterlist.tsv');

	let outfile = path.join(process.env.bic_etl_home, 'cdos', 'business', 'business', 'data_transformed', 'masterlist.csv');

	if (!fs.existsSync(filepath)) {
		log.warn("Folder does not does not exist to load CSV files for analysis: " + filepath);
		process.exit(0);
	}

	transform_masterlist(filepath, outfile); // Executes the processing
}

let header_columns = [
	"farmProduct",
	"debtorName",
	"debtorId",
	"counties",
	"cropYear",
	"debtorAddress",
	"additionalDebtors",
	"additionalDebtorId",
	"securedParty",
	"assignee",
	"additionalFarmProduct",
	"recordIdVerbatim",
	"recordId",
	"recordIdDate",
	"recordCountyFilingId",
	"recordCountyFiling",
	"amendmentIdVerbatim",
	"amendmentId"
];

String.prototype.toProperCase = function () {
	return this.replace(/\w\S*/g, function(str){return str.charAt(0).toUpperCase() + str.substr(1).toLowerCase();});
};

/*
	- all crop years is changed to 0 - 9999 min max ranges
*/
function transformation(row) {

	row['cropYear'] = row['Crop Year(s)'];

	row['debtorName'] = row['Debtor Name'].trim();
	row['additionalDebtors'] = row['Additional Debtors'].trim();
	row['debtorId'] = row['Debtor ID #'].trim();
	if (typeof row['Additional Debtors'] != "undefined") {
		let additional_debtors = row['Additional Debtors'];
		additional_debtors = additional_debtors.split(".");
		additional_debtors = additional_debtors.map(function(items1) {
			let pos = items1.indexOf("ID #:");
			if (pos != -1) {
				let additnlDebtr = items1.substring(pos + "ID #:".length).trim();
				return additnlDebtr;
			} else {
				return '<<IGNORE>>';
			}
		})
		.filter(function(debtor) {
			if(debtor !== '<<IGNORE>>') {
				return debtor;
			}
		});
		row['additionalDebtorId'] = additional_debtors.join(";");
	} else {
		row['additionalDebtorId'] = "";
	}

	let debtor_address = row['Debtor Address'];
	debtor_address = debtor_address.split(",");
	debtor_address = debtor_address.map(function(item) {
		return (["no address", "no city", "no state", "no zip"].indexOf(item.toLowerCase().trim()) == -1) ? item : '<<IGNORE>>';
	})
	.filter(function(item) {
		if(item !== '<<IGNORE>>') {
			return item;
		}
	});
	row['debtorAddress'] = debtor_address.join(",");

	row['recordIdVerbatim'] = row['Record Id #'];
	let id = row['Record Id #'];
	if (typeof row['Record Id #'] != "undefined") {
		let arr = row['Record Id #'].split("-");
		let date = arr.pop();
		date = date.trim();
		let datearr = [];
		if (date.indexOf("-") != -1) {
			datearr = date.split("-");
		} else {
			datearr = date.split("/");
		}
		let date1 = datearr[2].trim() + '-' + datearr[0].trim() + '-' + datearr[1].trim();
		row['recordIdDate'] = date1;
		let arr1 = arr.join("-");
		if (arr1.indexOf('(')) {
			let id = arr1.split("(");
			row['recordId'] = id.shift();
			row['recordId'] = row['recordId'].trim();
			let filingId = id.join('(');
			let filingIds = filingId.replace('(',"").replace(')',"").trim();
			let ids	= filingIds.split("-");
			row['recordCountyFilingId'] = ids.shift();
			row['recordCountyFilingId'] = row['recordCountyFilingId'].trim();
			row['recordCountyFiling'] = ids.pop();
			row['recordCountyFiling'] = (typeof row['recordCountyFiling'] != 'undefined') ? row['recordCountyFiling'].toProperCase().trim() : row['recordCountyFiling'];
		} else {
			row['recordId'] = arr1.trim();
			row['recordCountyFilingId'] = "";
			row['recordCountyFiling'] = "";
		}
	}

	let amendment_ids = row['Amendment ID #(s)'];
	amendment_ids = amendment_ids.split(";");
	amendment_ids = amendment_ids.map(function(item) {
		let id = item.split("-");
		id.pop();
		let arr1 = id.join("-");
		let arr2 = arr1.split("(");
		let arr3 = arr2.shift();
		return arr3.trim();
	});
	row['amendmentId'] = amendment_ids.join(";");
	row['amendmentIdVerbatim'] = row['Amendment ID #(s)'];

	if (typeof row['Assignee(s)'] == "undefined" || ( typeof row['Assignee(s)'] != "undefined" && row['Assignee(s)'].trim() == "NONE" )) {
		row['assignee'] = "";
	} else {
		row['assignee'] = row['Assignee(s)'].trim();
	}

	let farm_product_key = 'Farm Product';
	for(let key in row) {
		if(key.indexOf(farm_product_key) > -1) {
			farm_product_key = key;
		}
	}

	row['farmProduct'] = row[farm_product_key].trim();
	row['counties'] = row['County(ies)'].replace(/; /gi,";").trim();
	row['securedParty'] = row['Secured Party(ies)'].trim();
	row['additionalFarmProduct'] = row['Additional Farm Product(s)'].replace(/; /gi,";").trim(); // not sure on this
	// row['additionalFarmProduct'] = row['Additional Farm Product(s)'].trim();
	return row;
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
function transform_masterlist(file_path, outfile) {
  log.debug("Files to be transformed: " + file_path);
  //Original file
  let input_stream = fs.createReadStream(file_path)
  .on('error', error_handler);
  //Transformed file
	let output_stream = fs.createWriteStream(outfile)
	.on('error', error_handler);
  //Parse input
  let masterlist_parser = parse({
      delimiter: "\t",
      columns: true
  })
  .on('error', error_handler);
  //Transform input
  let masterlist_transformer = transform(transformation)
  .on('error', error_handler);
  //New data to output
  let masterlist_stringifier = stringify({
      header: true,
      columns: header_columns
  })
  .on('error', error_handler);
  // Connect all streams
  input_stream.pipe(masterlist_parser).pipe(masterlist_transformer).pipe(masterlist_stringifier).pipe(output_stream);

  //Once complete
  output_stream.on('finish', function() {
      log.debug('All items have been processed, final file is at: '+ outfile);
  });
}