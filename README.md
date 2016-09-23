# compose-elasticsearch-helloworld-nodejs overview

compose-elasticsearch-helloworld-nodejs is a sample Bluemix application which shows you how to connect to an IBM Compose for Elasticsearch for Bluemix service using Node.js.

## Running the app on Bluemix

1. If you do not already have a Bluemix account, [sign up here][bluemix_signup_url]

2. Download and install the [Cloud Foundry CLI][cloud_foundry_url] tool

3. Clone the app to your local environment from your terminal using the following command:

  ```
  git clone https://github.com/IBM-Bluemix/compose-elasticsearch-helloworld-nodejs.git
  ```

4. `cd` into this newly created directory

5. Open the `manifest.yml` file and change the `host` value to something unique. The host you choose will determinate the subdomain of your application's URL:  `<host>.mybluemix.net`

6. Connect to Bluemix in the command line tool and follow the prompts to log in.

  ```
  $ cf api https://api.ng.bluemix.net
  $ cf login
  ```

7. If you don't already have a Compose for Elasticsearch service in Bluemix, create one.

  **Note :** The Compose for Elasticsearch service does not offer a free plan. For details of pricing, see the _Pricing Plans_ section of the [Compose for Elasticsearch service][compose_for_elasticsearch_url] in Bluemix.

  ```
  $ cf create-service compose-for-elasticsearch Standard my-compose-for-elasticsearch-service
  ```

8. Push the app to Bluemix.

  ```
  $ cf push
  ```

Your application is now running at `<host>.mybluemix.net`.

The node-elasticsearch-helloworld app displays the contents of an _examples_ Elasticsearch index. To demonstrate that the app is connected to your service, add some words to the index. The words are displayed as you add them, with the most recently added words displayed first.

## Code Structure

| File | Description |
| ---- | ----------- |
|[**server.js**](server.js)|Establishes a connection to the Elasticsearch index using credentials from VCAP_ENV and handles create and read operations on the index. |
|[**main.js**](public/javascripts/main.js)|Handles user input for a PUT command and parses the results of a GET command to output the contents of the Elasticsearch index.|

The app uses a PUT and a GET operation:

- PUT
  - takes user input from [main.js](public/javascript/main.js)
  - uses the `client.index` method to add user input to the index

- GET
  - uses the `client.search` method to retrieve the contents of the _words_ type
  - returns the response to [main.js](public/javascript/main.js)

## Privacy Notice
The sample web application includes code to track deployments to Bluemix and other Cloud Foundry platforms. The following information is sent to a [Deployment Tracker](https://github.com/cloudant-labs/deployment-tracker) service on each deployment:

* Application Name (application_name)
* Space ID (space_id)
* Application Version (application_version)
* Application URIs (application_uris)

This data is collected from the VCAP_APPLICATION environment variable in IBM Bluemix and other Cloud Foundry platforms. This data is used by IBM to track metrics around deployments of sample applications to IBM Bluemix. Only deployments of sample applications that include code to ping the Deployment Tracker service will be tracked.

### Disabling Deployment Tracking

Deployment tracking can be disabled by removing `require("cf-deployment-tracker-client").track();` from the beginning of the `server.js` file.

[compose_for_elasticsearch_url]: https://console.ng.bluemix.net/catalog/services/compose-for-elasticsearch/
[bluemix_signup_url]: https://ibm.biz/compose-for-elasticsearch-signup
[cloud_foundry_url]: https://github.com/cloudfoundry/cli
