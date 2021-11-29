# cdos-business-business-etl
ETL processes for the CDOS business/business data to data.colorado.gov

## Requirements
In order to develop with this system, you'll need the following:
 - [Socrata DataSync](https://github.com/socrata/datasync/releases)
 - Node and NPM
 - [GitHub Actions runner, Act](https://github.com/nektos/act)

## Dev Setup
This is meant to be utilized in a similar manner to other repositories.
In order to simplify setup and changing secrets, certain files are expected one level above
this repo. We expect the following in the folder above where the repo is locally:
 - .secrets file, containing `CDOS_SFTP_USERNAME=`, `CDOS_SFTP_PASSWORD=', 'MY_SOCRATA_USERNAME=', 'MY_SOCRATA_PASSWORD=`

We also expect you to "source" the environment variables in the secrets file,
on linux this looks like `source ../.secrets`
## Usage
The aim is to provide ETL processes for datasets supported by CDOS BIC.
The ETL will occur on a regular basis in GitHub Actions.
The commands to run the ETL are defined in the package.json file.
The format of the commands are standardized. To run the ETL for a dataset,
use `npm run dataset_name`. To run just one part, use `npm run dataset_name:extract`.
To get a list of commands that can be used, run `npm run`:

```
Lifecycle scripts included in cdos_business_business:
  test
    npm-run-all -l -s extract-all transform-all

available via `npm run-script`:
  business_entities:extract
    curl -o business_entities.tsv -u $CDOS_SFTP_USERNAME:$CDOS_SFTP_PASSWORD -n --insecure --ftp-ssl sftp://ftps.sos.state.co.us/businessmaster/corpmstr.txt
  business_entities:transform
    node business_entities.js
  business_entities
    npm-run-all business_entities:*
  business_entities_action
    act -j business_entities_etl --secret-file ../.secrets
  action:test
    act -j business_etl_test --secret-file ../.secrets
  extract-all
    npm-run-all -l -p *:extract
  transform-all
    npm-run-all -l -p *:transform
```

## GitHub Actions
The GitHub Actions utilize the npm commands to run the ETL.
Each dataset has it's own workflow file, to be scheduled separately.
There is a "test" that runs the extract and the transform, then saves
the files for user inspection. This will be useful when reviewing PR's.

The standard scheduled action is of the form `setup`, `extract`, `transform`,
and `load`. The load is defined in the GitHub action only, to encourage usage
of automated github workflows. If needed to run locally, either use
Act CLI or copy commands manually.

## TODO
There are a number of TODO items that will need to be addressed to take
this from a pilot to a fully functioning GitHub organization that runs
all the ETL's.

1. Move socrata-updater.py to a "generic" or "helper" repository, and pull in dynamically.
    We may also want to use parameters instead of environment variables for certain options.
1. Expand Socrata upload datatypes/formats to include shapefiles, geojson, pandas dataframe (geodata).
1. Create a "confirmation" framework. This may look different for different datasets;
    some may be able to hit the data API, others may need to check the metadata API.
1. Should figure out from this framework how much work it takes to port a "node" suite
1. Should try a python suite to figure out how long that takes
