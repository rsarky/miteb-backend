const admin = require('firebase-admin');
var serviceAccount = require("./../config.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://mit-clubs-management.firebaseio.com"
});

var ejs = require('ejs');
var pdf = require('html-pdf');
var Excel = require('exceljs');
const moment = require('moment');
const fs = require('fs');
const XLSX = require('xlsx');

const AD_NAME = "Naranaya Shenoy"
const SO_NAME = "Ashok Rao"

var config = require('../config/config.js');

exports.generate_pdf = function(req,res) {
  var eventID = req.query.eventID;
  var filename = `${eventID}.pdf`

  var eventref = admin.database().ref('events/' + eventID);
  eventref.once("value", function(snapshot) {
    var html;
    // Room selecting logic
    var rooms = snapshot.val().rooms;
    var roomlist = "";
    // determines the academic block according to the first digit as array index
    var room_block = ["AB-1","AB-2","NLH","IC","AB-5"];
    rooms.forEach(function(room){
      var block = Math.floor(room/1000) - 1;
      var room_no = room%1000;
      block = room_block[block];
      roomlist+=block + "-" + room_no + ", ";
    });
    roomlist = roomlist.replace(/,\s*$/, "");
    var notes;
    var visibility = "hidden";
    if(snapshot.val().notes)
    {
      notes = snapshot.val().notes;
      visibility = "visible";
    }
    ejs.renderFile('eventpdf.ejs', {
      club_name: snapshot.val().clubName,
      booker_name: snapshot.val().booker_name,
      booker_contact: snapshot.val().booker_contact,
      booker_reg_no: snapshot.val().booker_reg_no,
      title: snapshot.val().title,
      type: snapshot.val().type,
      start_date: moment(snapshot.val().start_date, 'DD-MM-YYYY').format("dddd, DD MMM YYYY"),
      end_date: moment(snapshot.val().end_date, 'DD-MM-YYYY').format("dddd, DD MMM YYYY"),
      room_list: roomlist,
      isVisible: visibility,
      Notes: notes,
      fa_name: snapshot.val().FA_name,
      ad_name: AD_NAME,
      so_name: SO_NAME,
      fa_date: snapshot.val().FA_date,
      ad_date: snapshot.val().AD_date,
      so_date: snapshot.val().SO_date,
    }, function(err, result) {
      if (result) {
         html = result;
      }
      else {
         res.end('An error occurred');
         console.log(err);
      }
  });
    var options = {
      filename: filename,
      height: "870px",
      width: "650px",
      orientation: 'portrait',
      type: "pdf",
      timeout: '30000',
      border: "10",
    };

  pdf.create(html, options).toFile(function(err, result) {
    if (err) {
      console.log(err);
    }
    else {
      config.uploadToS3(filename, (err, downloadURL) => {
        if(err) {
          res.status(200).send(err)
          return
        }
        else {
          admin.database().ref('events').child(eventID + '/receiptURL').set(downloadURL)
          res.status(200).send(downloadURL)
          fs.unlink(filename, (err) => {
            if (err) throw err;
            console.log(filename +' was deleted from local server');
          });
          return
        }

      })
    }
  });
  },
  function (error) {
     console.log("Error: " + error.code);
});
  
};

exports.generate_sheet = function(req, res) {
  try {
      function snapshotToArray(snapshot) {
        var returnArr = [];

         snapshot.forEach(function(childSnapshot) {
            var item = childSnapshot.val();
            item.key = childSnapshot.key;

            returnArr.push(item);
          });

    return returnArr;
    };
        var months = ['January','Feburary','March','April',
        'May','June','July','August',
        'September','October','November','December'];
        var clubID = req.query.uid;
        var type_event;
        var title;
        var sdate;
        var edate;
        var roomlist;
        var booker_name;
        var workbook = new Excel.Workbook();
        var type = req.query.mode;
        var clubRef = admin.database().ref();
        if(type == 'CUSTOM')
        {
          var d1 = req.query.from;
          var d2 = req.query.to;
          var worksheet = workbook.addWorksheet('Event Details');

          worksheet.columns = [
              { header: 'Type', key: 'type_event', width: 15 },
              { header: 'Title', key: 'title', width: 25 },
              { header: 'Start Date', key: 'sdate', width: 25 },
              { header: 'End Date', key: 'edate', width: 25 },
              { header: 'Rooms', key: 'roomlist', width: 25 },
              { header: 'Booked By', key: 'booker_name', width: 25 }
          ];
          var eventID;
          clubRef.child('clubs/' + clubID + '/my_events').once("value", function(snapshot) {
          eventID = snapshotToArray(snapshot);
          var eventCount = eventID.length;
          var i = 0;
          eventID.forEach(function(element){
            //http://localhost:9000/event/generate-sheet?uid=9xdTvUjqtuYI5yYOJ4BbhsPAIyx2&mode=CUSTOM&from=12-07-2018&to=12-12-2018
            clubRef.child('events/'+element).once("value", function(snapshot){
              sdate = snapshot.child('start_date').val();
              edate = snapshot.child('end_date').val();
              var t1 = moment(d1, 'DD-MM-YYYY');
              var t2 = moment(d2, 'DD-MM-YYYY');
              var t3 = moment(sdate, 'DD-MM-YYYY');
              var t4 = moment(edate, 'DD-MM-YYYY');
              if(moment(t1).isBefore(t3) && moment(t2).isAfter(t4)){
                type_event = snapshot.child('type').val();
                sdate = t3.format('dddd, Do MMMM YYYY');
                edate = t4.format('dddd, Do MMMM YYYY');
                title = snapshot.child('title').val();
                var rooms = snapshot.child('rooms/').val();
                roomlist = "";
                var room_block = ["AB-1","AB-2","NLH","IC","AB-5"];
                rooms.forEach(function(room){
                  var block = Math.floor(room/1000) - 1;
                  var room_no = room%1000;
                  block = room_block[block];
                  roomlist+=block + "-" + room_no + ", ";
                });
                roomlist = roomlist.replace(/,\s*$/, "");
                booker_name = snapshot.child('booker_name').val();
                worksheet.addRow({type_event: type_event, title: title, sdate: sdate,
                  edate: edate, roomlist: roomlist, booker_name: booker_name});
              }
              i+=1;
              if(i==eventCount) {
                workbook.xlsx.writeFile(__dirname + '/eventDetails.xlsx').then(function() {
                  console.log('file is written');
                  res.download(__dirname + '/eventDetails.xlsx', function(err, result){
                    if(err){
                      console.log('Error downloading file: ' + err);  
                    }
                    else{
                      console.log('File downloaded successfully');
                    }
                  });
                });
              }
            })
          })
       });
        }
        else if(type == 'ALL')
        {
          console.log('extract monthly');
          var eventID;
          clubRef.child('clubs/' + clubID + '/my_events').once("value", function(snapshot) {
            eventID = snapshotToArray(snapshot);
            var eventCount = eventID.length;
            var i = 0;
            eventID.forEach(function(element){
              clubRef.child('events/'+element).once("value", function(snapshot) {
                sdate = snapshot.child('start_date').val();
                edate = snapshot.child('end_date').val();
                var t1 = moment(sdate, 'DD-MM-YYYY');
                var t2 = moment(edate, 'DD-MM-YYYY');
                var mon = t1.month();
                if(workbook.getWorksheet(months[mon])) {
                  worksheet = workbook.getWorksheet(months[mon]);
                }
                else {
                  var worksheet = workbook.addWorksheet(months[mon]);
                }
                worksheet.columns = [
                    { header: 'Type', key: 'type_event', width: 15 },
                    { header: 'Title', key: 'title', width: 25 },
                    { header: 'Start Date', key: 'sdate', width: 25 },
                    { header: 'End Date', key: 'edate', width: 25 },
                    { header: 'Rooms', key: 'roomlist', width: 25 },
                    { header: 'Booked By', key: 'booker_name', width: 25 }
                ];
                type_event = snapshot.child('type').val();
                sdate = t1.format('dddd, Do MMMM YYYY');
                edate = t2.format('dddd, Do MMMM YYYY');
                title = snapshot.child('title').val();
                var rooms = snapshot.child('rooms/').val();
                roomlist = "";
                var room_block = ["AB-1","AB-2","NLH","IC","AB-5"];
                rooms.forEach(function(room){
                  var block = Math.floor(room/1000) - 1;
                  var room_no = room%1000;
                  block = room_block[block];
                  roomlist+=block + "-" + room_no + ", ";
                });
                roomlist = roomlist.replace(/,\s*$/, "");
                booker_name = snapshot.child('booker_name').val();
                worksheet.addRow({type_event: type_event, title: title, sdate: sdate,
                  edate: edate, roomlist: roomlist, booker_name: booker_name});
                i+=1;
                if(i==eventCount)
              {
                workbook.xlsx.writeFile(__dirname + '/eventDetails.xlsx').then(function() {
              console.log('file is written');
              res.download(__dirname + '/eventDetails.xlsx', function(err, result){
                  if(err){
                    console.log('Error downloading file: ' + err);  
                  }
                  else{
                    console.log('File downloaded successfully');
                  }
              });
          }); 
              }
              });
              
            });
          });
        }
        
    } catch(err) {
        console.log('Error: ' + err);
    }  
};