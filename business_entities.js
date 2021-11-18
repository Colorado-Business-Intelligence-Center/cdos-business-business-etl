const fs = require('fs');
const path = require('path');
const program = require('commander');
const parse = require('csv-parse');
const transform = require('stream-transform');
const stringify = require('csv-stringify');
const moment = require('moment');
const orr = require(path.resolve('orr.js'));
const orrc = orr({"state": "CO", "rulesPath": __dirname + "/rules/rules_business_entities_city.txt"});

program
  .option('-f, --folderpath <n>', 'data source')
  .option('-e, --ext <n>', '.txt')
  .parse(process.argv);

let entityList = {};

console.log("Program Started");

let entityFile = path.resolve(path.join('rules','entitytype.csv'));

let ext = (program.ext) ? program.ext : '.txt';
let file_path = (program.folderpath) ? program.folderpath : path.resolve('business_entities.tsv');

let outfile = path.resolve('business_entities.csv');

if (!fs.existsSync(file_path)) {
    console.log("Folder does not exist to load CSV files for analysis.");
    console.error({file: file_path}, "Folder does not does not exist to load CSV files for analysis.");
    process.exit(0);
}
let input_stream = fs.createReadStream(entityFile)
.on('error', error_handler);
//Parse input
let biz_entities_parser = parse({
    delimiter: ",",
    columns: true
}).on('readable', function(){
let record
while (record = this.read()) {
    entityList[record['Entity Type']] = record['Entity Type Description'];
}
}).on('end', function() {
transform_biz_entities(file_path, outfile); // Executes the processing
})
input_stream.pipe(biz_entities_parser);

let header_columns = [
    "entityId",
    "entityName",
    "principalAddress1",
    "principalAddress2",
    "principalCity",
    "principalState",
    "principalZipCode",
    "principalCountry",
    "mailingAddress1",
    "mailingAddress2",
    "mailingCity",
    "mailingState",
    "mailingZipCode",
    "mailingCountry",
    "entityStatus",
    "jurisdictonOfFormation",
    "entityType",
    "agentFirstName",
    "agentMiddleName",
    "agentLastName",
    "agentSuffix",
    "agentOrganizationName",
    "agentPrincipalAddress1",
    "agentPrincipalAddress2",
    "agentPrincipalCity",
    "agentPrincipalState",
    "agentPrincipalZipCode",
    "agentPrincipalCountry",
    "agentMailingAddress1",
    "agentMailingAddress2",
    "agentMailingCity",
    "agentMailingState",
    "agentMailingZipCode",
    "agentMailingCountry",
    "entityFormDate"
];

const ynMap = { "y": 1, "n": 0};

/*
   - convert term date into YYYY-MM-DD format
   - column names to small camel
   - added entityType from lookup table
*/
function transformation(row) {
  try {
    let entity_id_input = 'Entity Id';
    for(let key in row) {
      if(key.indexOf('Entity Id') > -1) {
        entity_id_input = key;
      }
    }

		let entityDateParts = row["Entity Form Date"].split('/');
		let entity_form_date = entityDateParts[2] + '-' + entityDateParts[0] + '-' + entityDateParts[1]

    let tRow = {};
    tRow["entityId"]                = row[entity_id_input].replace('\n','');
    tRow["entityName"]              = row["Entity Name"];
    tRow["principalAddress1"]       = row["Principal Address 1"].replace(/%/g, '');
    tRow["principalAddress2"]       = row["Principal Address 2"];
    tRow["principalCity"]           = orrc.resolve(row["Principal City"]);
    tRow["principalState"]          = row["Principal State"];
    tRow["principalZipCode"]        = row["Principal Zip"];
    tRow["principalCountry"]        = row["Principal Country"];
    tRow["mailingAddress1"]         = row["Mailing Address 1"];
    tRow["mailingAddress2"]         = row["Mailing Address 2"];
    tRow["mailingCity"]             = orrc.resolve(row["Mailing City"]);
    tRow["mailingState"]            = row["Mailing State"];
    tRow["mailingZipCode"]          = row["Mailing Zip"];
    tRow["mailingCountry"]          = row["Mailing Country"];
    tRow["entityStatus"]            = row["Entity Status"];
    tRow["jurisdictonOfFormation"]  = row["Jurisdiciton of Formation"];
    tRow["entityType"]              = entityList[row["Entity Type"]];
    tRow["agentFirstName"]          = row["Agent First Name"];
    tRow["agentMiddleName"]         = row["Agent Middle Name"];
    tRow["agentLastName"]           = row["Agent Last Name"];
    tRow["agentSuffix"]             = row["Agent Suffix"];
    tRow["agentOrganizationName"]   = row["Agent Organization Name"];
    tRow["agentPrincipalAddress1"]  = row["Agent Principal Address 1"];
    tRow["agentPrincipalAddress2"]  = row["Agent Principal Address 2"];
    tRow["agentPrincipalCity"]      = row["Agent Principal City"];
    tRow["agentPrincipalState"]     = row["Agent Principal State"];
    tRow["agentPrincipalZipCode"]   = row["Agent Principal Zip"];
    tRow["agentPrincipalCountry"]   = row["Agent Principal Country"];
    tRow["agentMailingAddress1"]    = row["Agent Mailing Address 1"];
    tRow["agentMailingAddress2"]    = row["Agent Mailing Address 2"];
    tRow["agentMailingCity"]        = row["Agent Mailing City"];
    tRow["agentMailingState"]       = row["Agent Mailing State"];
    tRow["agentMailingZipCode"]     = row["Agent Mailing Zip"];
    tRow["agentMailingCountry"]     = row["Agent Mailing Country"];
    tRow["entityFormDate"]          = entity_form_date;
    return tRow;
  } catch(err) {
      console.error(err.stack);
  }
}

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function error_handler(e) {
    console.error("Error mid-stream: " + e);
    setTimeout(function() {
      process.exit(1);
    }, 200);
}

/*
   This function will get the files to be transformed and perform the transform
*/
function transform_biz_entities(file_path, outfile) {
  console.log("Files to be transformed: " + file_path);
  //Original file
  let input_stream = fs.createReadStream(file_path)
  .on('error', error_handler);
  //Transformed file
  let output_stream = fs.createWriteStream(outfile)
  .on('error', error_handler);
  //Parse input
  let biz_entities_parser = parse({
      delimiter: "\t",
      columns: true
  })
  .on('error', error_handler);
  //Transform input
  let biz_entities_transformer = transform(transformation)
  .on('error', error_handler);
  //New data to output
  let biz_entities_stringifier = stringify({
      header: true,
      columns: header_columns
  })
  .on('error', error_handler);
  // Connect all streams
  input_stream.pipe(biz_entities_parser).pipe(biz_entities_transformer).pipe(biz_entities_stringifier).pipe(output_stream);

  //Once complete
  output_stream.on('finish', function() {
      console.log('All items have been processed, final file is at: '+ outfile);
  });
}
