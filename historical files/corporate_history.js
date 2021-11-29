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
	.option('-e, --ext <n>', '.txt')
	.parse(process.argv);

program.title = (program.title) ? program.title : 'Corporate Transaction History';
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

	let ext = (program.ext) ? program.ext : '.txt';
	let file_paths = [];
	file_paths.push(path.join(process.env.bic_etl_home, 'cdos', 'business', 'business', 'data_source', 'corphist-1.tsv'));
	file_paths.push(path.join(process.env.bic_etl_home, 'cdos', 'business', 'business', 'data_source', 'corphist-2.tsv'));

	let outfile = path.join(process.env.bic_etl_home, 'cdos', 'business', 'business', 'data_transformed', 'corphist.csv');

	if (!fs.existsSync(file_paths[0]) || !fs.existsSync(file_paths[1])) {
	    log.warn("Folder does not does not exist to load CSV files for analysis: " + file_paths);
	    process.exit(0);
	}
	transform_corp_trans(file_paths, outfile, true);
}

var header_columns = [
    "entityId",
    "transactionId",
    "historyDes",
    "comment",
    "receivedDate",
    "effectiveDate",
    "name"
];

/*
   - convert term date into YYYY-MM-DD format
   - column names to small camel
   - added entityTypeVerbatim from lookup table
*/
function transformation(row) {
  try {

		let entity_id_input = 'Entity Id';
		for(let key in row) {
			if(key.indexOf('Entity Id') > -1) {
				entity_id_input = key;
			}
		}

    var formDate = new Date(row["Effective Dtm"]);
    var dateStrEff = pad(formDate.getMonth()+1, 2) + '/' + pad(formDate.getDate(), 2) + '/' + formDate.getFullYear();
		var timeStrEff = formDate.getHours() + ":" + pad(formDate.getMinutes(), 2);
		dateStrEff += " " + timeStrEff;
		formDate = new Date(row["Received Dtm"] );
		var dateStrRec = pad(formDate.getMonth()+1, 2) + '/' + pad(formDate.getDate(), 2) + '/' + formDate.getFullYear();
		var timeStrRec = formDate.getHours() + ":" + pad(formDate.getMinutes(), 2);
		dateStrRec += " " + timeStrRec;
		let tRow = {};
		tRow["entityId"]                   		= row[entity_id_input];
		tRow["transactionId"]                  = row["Transaction Id"];
		tRow["historyDes"]                	  	= row["History Description"];
		tRow["comment"]                      	= row["Comment"];
		tRow["receivedDate"]               		= dateStrRec;
		tRow["effectiveDate"]                	= dateStrEff;
		tRow["name"]                    				= row["Name"];

    return tRow;
  } catch(err) {
    log.error(err.stack);
  }
}

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}


function error_handler(e) {
    log.error("Error mid-stream: " + e);
    setTimeout(function() {
      process.exit(1);
    }, 200);
}

let append_file = false;

/*
   This function will get the files to be transformed and perform the transform
*/
function transform_corp_trans(file_paths, outfile, first_pass) {
	let file_path = file_paths.shift();
  log.debug("Files to be transformed: " + file_path);
  //Original file
  let input_stream = fs.createReadStream(file_path)
  .on('error', error_handler);
  //Transformed file
	let output_stream = {};
	if(!append_file) {
		output_stream = fs.createWriteStream(outfile)
	  .on('error', error_handler);
		append_file = true;
	} else {
		output_stream = fs.createWriteStream(outfile, {flags: 'a'})
	  .on('error', error_handler);
	}


  //Parse input
  let corp_trans_parser = parse({
      delimiter: "\t",
      columns: true
  })
  .on('error', error_handler);
  //Transform input
  let corp_trans_transformer = transform(transformation)
  .on('error', error_handler);

  //New data to output
	let options = (first_pass ?
	{
		header: true,
		columns: header_columns
	} : {
		header: false
	});
  let corp_trans_stringifier = stringify(options)
  .on('error', error_handler);
  // Connect all streams
  input_stream.pipe(corp_trans_parser).pipe(corp_trans_transformer).pipe(corp_trans_stringifier).pipe(output_stream);

  //Once complete
  output_stream.on('finish', function() {
		if(file_paths.length > 0) {
      transform_corp_trans(file_paths, outfile);
    } else {
      log.debug('All items have been processed, final file is at: '+ outfile);
    }
  });
}
