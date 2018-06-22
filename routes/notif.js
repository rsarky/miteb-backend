var express = require('express');
var router = express.Router();

var notif_controller = require('../controllers/notifController');

router.post('/sendOTP', notif_controller.send_otp);

router.get('/send-email', notif_controller.send_email);

router.get('/send-notif', notif_controller.send_notif);

module.exports = router;