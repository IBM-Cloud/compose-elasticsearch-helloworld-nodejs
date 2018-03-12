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

"use strict";
/* jshint node:true */

// Add the express web framework
const express = require("express");
const app = express();

// Use body-parser to handle the PUT data
const bodyParser = require("body-parser");
app.use(
    bodyParser.urlencoded({
        extended: false
    })
);

// Util is handy to have around, so thats why that's here.
const util = require('util')
// and so is assert
const assert = require('assert');

// Then we'll pull in the database client library
let elasticsearch=require('elasticsearch');

// Now lets get cfenv and ask it to parse the environment variable
let cfenv = require('cfenv');

// load local VCAP configuration  and service credentials
let vcapLocal;
try {
  vcapLocal = require('./vcap-local.json');
  console.log("Loaded local VCAP");
} catch (e) { 
    // console.log(e)
}

const appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {}
const appEnv = cfenv.getAppEnv(appEnvOpts);

// Within the application environment (appenv) there's a services object
let services = appEnv.services;

// The services object is a map named by service so we extract the one for Elasticsearch
let es_services = services["compose-for-elasticsearch"];

// This check ensures there is a services for Elasticsearch databases
assert(!util.isUndefined(es_services), "Must be bound to compose-for-elasticsearch services");

// We now take the first bound Elasticsearch service and extract it's credentials object
let credentials = es_services[0].credentials;

// Within the credentials, an entry ca_certificate_base64 contains the SSL pinning key
// We convert that from a string into a Buffer entry in an array which we use when
// connecting.
let ca = new Buffer(credentials.ca_certificate_base64, 'base64');

let client = new elasticsearch.Client( {
  hosts: [
    credentials.uri,
    credentials.uri_direct_1
  ],
  ssl: {
    ca: ca
  }
});

// We want to extract the port to publish our app on
let port = process.env.PORT || 8080;

// We can now set up our web server. First up we set it to serve static pages
app.use(express.static(__dirname + '/public'));

// Create the index if it doesn't already exist
function checkIndices() {
    client.indices.exists({
        index: 'grand_tour'
    }, function(err, resp, status) {
        if (resp === false) {
            client.indices.create({
                index: 'grand_tour',
                body: {
                    mappings: {
                        "words": {
                            "properties": {
                                "word": { "type": "text" },
                                "definition": { "type": "text" },
                                "added": { "type": "date" }
                            }
                        }
                    }
                }
            }, function(err, resp, status) {
                if (err) {
                    console.log(err);
                }
            });
        }
    });
}

// Check for an existing index
checkIndices();

// Add a word to the index
function addWord(word, definition) {
    return new Promise(function(resolve, reject) {
        let now = new Date();
        client.index({
            index: 'grand_tour',
            type: 'words',
            body: {
                "word": word,
                "definition": definition,
                "added": now
            },
            refresh: "wait_for"
        }, function(err, resp, status) {
            if (err) {
                reject(err);
            } else {
                resolve(resp);
            }
        });
    });
}

// Get words from the index
function getWords() {
    return new Promise(function(resolve, reject) {
        client.search({
            index: 'grand_tour',
            type: 'words',
            _source: ['word', 'definition'],
            body: {
                sort: {
                    'added': {
                        order: 'desc'
                    }
                }
            }
        }, function(err, resp, status) {
            if (err) {
                reject(err);
            } else {
                let words = [];
                resp.hits.hits.forEach(function(hit) {
                    words.push({ "word": hit._source.word, "definition": hit._source.definition });
                });
                resolve(words);
            }
        });
    });
}

// The user has clicked submit to add a word and definition to the index
// Send the data to the addWord function and send a response if successful
app.put("/words", function(request, response) {
    addWord(request.body.word, request.body.definition).then(function(resp) {
        response.send(resp);
    }).catch(function(err) {
        console.log(err);
        response.status(500).send(err);
    });
});

// Read from the database when the page is loaded or after a word is successfully added
// Use the getWords function to get a list of words and definitions from the index
app.get("/words", function(request, response) {
    getWords().then(function(words) {
        response.send(words);
    }).catch(function(err) {
        console.log(err);
        response.status(500).send(err);
    });
});

// Listen for a connection.
app.listen(port, function() {
    console.log('Server is listening on port ' + port);
});