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
 - .secrets file, containing `CDOS_SFTP_USERNAME=` and `CDOS_SFTP_PASSWORD=`
 - config.json file, containing socrata datasync configuration
 - DataSync.jar file

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
  business_entities:load
    java -jar ../DataSync.jar business_entities.sij
  business_entities
    npm-run-all business_entities:*
  business_entities_action:full
    act -j business_entities_etl --secret-file ../.secrets
  business_entities_action:test
    act -j business_entities_etl_test --secret-file ../.secrets
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

There are several setup steps that occur for the load in GitHub
Actions, namely
 - Downloading DataSync
 - Configure Datasync
 - Install java
 - Setup dependencies (npm)
