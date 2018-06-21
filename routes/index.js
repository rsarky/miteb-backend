var express = require('express');
var router = express.Router();

var user_controller = require('../controllers/userController');
var event_controller = require('../controllers/eventController');
var notif_controller = require('../controllers/notifController');

router.post('/signup', user_controller.signup);

router.get('/generate-pdf', event_controller.generate_pdf);

router.get('/send-otp', notif_controller.send_otp);

router.get('/update-user', user_controller.update_user);

router.post('/send-email', notif_controller.send_email);

router.post('/send-notif', notif_controller.send_notif);

router.get('/', event_controller.basic);

module.exports = router;