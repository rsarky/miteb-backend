const admin = require('firebase-admin');
const express = require('express');
const moment = require('moment');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer')
const AWS = require('aws-sdk')
const fs = require('fs')
var cors = require('cors')
var pdf = require('html-pdf');
var ejs = require('ejs');
const smtpTransport = require('nodemailer-smtp-transport')

var serviceAccount = require("../config.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://mit-clubs-management.firebaseio.com"
});

AWS.config.update({
    accessKeyId: "AKIAIWXHQYTV6HV7KMKA",
    secretAccessKey: "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",
});

app = express();
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

app.use(express.static('views'));
app.set('views', __dirname)

const s3 = new AWS.S3();
const bucketName = 'miteb'

exports.uploadToS3 = function(filename, callback) {
  fs.readFile(filename, function(err, data) {
    if(err) {
      console.log("error while reading", err)
      callback(err)
    }
    else {
      let params = {Bucket: bucketName, Key: filename, Body: data}
      s3.putObject(params, function(err, data) {
        if(err) {
          console.log("error" + err)
          callback(err)
          return
        }
        else {
          console.log("uploaded succcessfully")
          downloadURL = `https://s3.amazonaws.com/${bucketName}/${filename}`;
          callback(null, downloadURL)
          return
        }
      })
    }
  })
};