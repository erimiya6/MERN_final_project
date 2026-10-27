const express = require('express');
const router = express.Router();
const {
  submitClaim,
  getMyClaims,
  getItemClaims,
  reviewClaim,
} = require('../controllers/claimController');
const { protect } = require('../middleware/auth');

router.use(protect); // All claim routes require authentication

router.post('/', submitClaim);
router.get('/my-claims', getMyClaims);
router.get('/item/:itemId', getItemClaims);
router.patch('/:id/review', reviewClaim);

module.exports = router;
