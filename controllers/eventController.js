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
      // render on success
      if (result) {
         html = result;
      }
      // render or error
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
        var montht = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var clubID = req.query.uid;
        var sdate;
        var edate;
        var club;
        var desc;
        var workbook = new Excel.Workbook();
        workbook.views = [
          {
            x: 0, y: 0, width: 10000, height: 20000,
            firstSheet: 0, activeTab: 7, visibility: 'visible'
          }
        ]
        var type = req.query.mode;
        var clubRef = admin.database().ref();
        if(type == 'CUSTOM')
        {
          var d1 = req.query.from;
          var d2 = req.query.to;
          var worksheet = workbook.addWorksheet('Event Details');

          //defining header columns
          worksheet.columns = [
              { header: 'Start Date', key: 'sdate', width: 30 },
              { header: 'End Date', key: 'edate', width: 30 },
              { header: 'Club Name', key: 'club', width: 40 },
              { header: 'Event Name', key: 'eventName', width: 40 }
          ];
          var eventID;
          clubRef.child('clubs/' + clubID + '/my_events').once("value", function(snapshot) {
          eventID = snapshotToArray(snapshot);
          
          //iterates through the clubID array and inserts data accordingly into the workbook
          eventID.forEach(function(element){
            clubRef.child('events/'+element).once("value", function(snapshot){
              var t1 = moment(d1, 'DD-MM-YYYY');
              var t2 = moment(d2, 'DD-MM-YYYY');
              var t3 = moment(sdate, 'DD-MM-YYYY');
              var t4 = moment(edate, 'DD-MM-YYYY');
              
              if(moment(t1).isBefore(t3) && moment(t2).isAfter(t4)){
                sdate = snapshot.child('start_date').val();
                edate = snapshot.child('end_date').val();
                club = snapshot.child('clubName').val();
                desc = snapshot.child('desc').val();
                worksheet.addRow({sdate: sdate, edate: edate, club: club, eventName: desc});    
              }
            })
          })
            //Writes the content on an excel sheet and downloads it
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
       });
        }
        else if(type == 'ALL')
        {
          console.log('extract monthly');
          var eventID;
          clubRef.child('clubs/' + clubID + '/my_events').once("value", function(snapshot) {
            eventID = snapshotToArray(snapshot);
            var eventCount = eventID.length;
            console.log(eventID.length);
            var i = 0;
            eventID.forEach(function(element){
              clubRef.child('events/'+element).once("value", function(snapshot) {
                sdate = snapshot.child('start_date').val();
                edate = snapshot.child('end_date').val();
                club = snapshot.child('clubName').val();
                desc = snapshot.child('desc').val();
                console.log(sdate);
                console.log(edate);
                console.log(club);
                console.log(desc);
                var t1 = moment(sdate, 'DD-MM-YYYY');
                var t2 = moment(edate, 'DD-MM-YYYY');
                var mon = t1.month();
                if(workbook.getWorksheet(montht[mon])) {
                  console.log('true');
                  worksheet = workbook.getWorksheet(montht[mon]);
                }
                else {
                  console.log('false');
                  var worksheet = workbook.addWorksheet(montht[mon]);
                  // http://localhost:9000/event/generate-sheet/9xdTvUjqtuYI5yYOJ4BbhsPAIyx2/2
                }
                worksheet.columns = [
              { header: 'Start Date', key: 'sdate', width: 30 },
              { header: 'End Date', key: 'edate', width: 30 },
              { header: 'Club Name', key: 'club', width: 40 },
              { header: 'Event Name', key: 'eventName', width: 40 }
          ];
                worksheet.addRow({sdate: sdate, edate: edate, club: club, eventName: desc});
                i+=1;
                console.log(i);
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