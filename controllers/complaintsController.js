const admin = require('firebase-admin');
var serviceAccount = require("./../config.json");

var Excel = require('exceljs');
const moment = require('moment');

var config = require('../config/config.js');

exports.generate_sheet = function(req, res) {
	try {
		function snapshotToArray(snapshot) {
	        var returnArr = [];

	         snapshot.forEach(function(childSnapshot) {
	            var item = childSnapshot.key;
	            returnArr.push(item);
	          });

	    return returnArr;
	    };
		
		var complaintID = req.query.uid;
		var dated;
		var subject;
		var status;
		var workbook = new Excel.Workbook();
		var complaintRef = admin.database().ref();
		var worksheet = workbook.addWorksheet('Complaints');
		worksheet.columns = [
			{ header: 'Subject', key: 'subject', width: 40},
			{ header: 'Date of complaint', key: 'dated', width: 30},
			{ header: 'Status', key: 'status', width: 20}
		];
		var complaintID;
		complaintRef.child('complaints/').once("value", function(snapshot) {
			complaintID = snapshotToArray(snapshot);
			complaintCount = complaintID.length;
			var i = 0;
			complaintID.forEach(function(element) {
				complaintRef.child('complaints/' + element).once("value", function(snapshot) {
					subject = snapshot.child('subject').val();
					dated = snapshot.child('dated').val();
					status = snapshot.child('isResolved').val();
					dated = moment(dated, 'DD-MM-YYYY');
					dated = dated.format('dddd, Do MMM YYYY')
					status = (status==true)?'resolved':'pending';
					worksheet.addRow({subject: subject, dated: dated, status: status});
					i+=1;
					if(i==complaintCount) {
						workbook.xlsx.writeFile(__dirname + '/Complaints.xlsx').then(function() {
		                  	console.log('file is written');
		                  	res.download(__dirname + '/Complaints.xlsx', function(err, result){
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
	} catch(err) {
        console.log('Error: ' + err);
    }
}