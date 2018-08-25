var express = require('express');
var router = express.Router();

var event_controller = require('../controllers/eventController');

router.get('/generate-pdf', event_controller.generate_pdf);
router.get('/generate-sheet', event_controller.generate_sheet);
router.get('/generate-daily-events',event_controller.generate_daily_events);


module.exports = router;