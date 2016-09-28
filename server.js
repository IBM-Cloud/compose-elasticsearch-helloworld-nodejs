/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the “License”);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an “AS IS” BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 // First add the obligatory web framework
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({
  extended: false
}));

// Util is handy to have around, so thats why that's here.
const util = require('util')
// and so is assert
const assert = require('assert');

// We want to extract the port to publish our app on
var port = process.env.VCAP_APP_PORT || 8080;

// Then we'll pull in the database client library
var elasticsearch=require('elasticsearch');

// Now lets get cfenv and ask it to parse the environment variable
var cfenv = require('cfenv');
var appenv = cfenv.getAppEnv();

// Within the application environment (appenv) there's a services object
var services = appenv.services;

// The services object is a map named by service so we extract the one for Elasticsearch
var es_services = services["compose-for-elasticsearch"];

// This check ensures there is a services for Elasticsearch databases
assert(!util.isUndefined(es_services), "Must be bound to compose-for-elasticsearch services");

// We now take the first bound Elasticsearch service and extract it's credentials object
var credentials = es_services[0].credentials;

// Within the credentials, an entry ca_certificate_base64 contains the SSL pinning key
// We convert that from a string into a Buffer entry in an array which we use when
// connecting.
var ca = new Buffer(credentials.ca_certificate_base64, 'base64');

var client = new elasticsearch.Client( {
  hosts: [
    credentials.uri,
    credentials.uri_direct_1
  ],
  ssl: {
    ca: ca
  }
});

client.indices.exists({
  index:'examples'
},function(err,resp,status) {
  if (resp === false) {
    client.indices.create({
      index: 'examples'
    },function(err,resp,status) {
      if(err) {
        console.log(err);
      }
    });
  }
});

// We can now set up our web server. First up we set it to serve static pages
app.use(express.static(__dirname + '/public'));

app.put("/words", function(request, response) {
  var now = new Date();
  client.index({
    index: 'examples',
    type: 'words',
    body: {
      "word": request.body.word,
      "definition": request.body.definition,
      "added": now
    }
  },function(err,resp,status) {
    if (err) {
      response.status(500).send(err);
    } else {
      response.send(resp);
    }
  });
});

// Read from the database when someone visits /words
app.get("/words", function(request, response) {

  client.search({
    index: 'examples',
    type: 'words',
    fields: ['word','definition'],
    body: {
      sort: {
        'added' : {
          order: 'desc'
        }
      }
    }
  },function (err,resp,status) {
    if (err) {
      response.status(500).send(err);
    } else {
      // get the words from the index
      var words = [];
      resp.hits.hits.forEach(function(hit){
        words.push( { "word" : hit.fields.word , "definition" : hit.fields.definition } );
      });
      response.send(words);
    }
  });

});

// Now we go and listen for a connection.
app.listen(port);

require("cf-deployment-tracker-client").track();
