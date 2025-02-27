// import
const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const verifyToken = require('../middleware/verify-token')
const { Product, Review } = require('../models/product')
const { User } = require('../models/user')
const { ObjectId } = require('bson')
const { getReviews } = require('../utility/video-games/utility')

// review routes
// GET /reviews
router.get('/', verifyToken, async (req, res) => {
    try {
        const products = await Product.findById(req.headers.productid).populate('reviews.author', 'username')

        if (!products || products.reviews.length === 0) {
            return res.status(204)
        }

        const userReview = products.reviews.find(review => review.author._id.toString() === req.user._id);

        if (!userReview) {
            return res.status(204)
        }

        res.status(200).json({ text: userReview.text, author: userReview.author.username, id: userReview._id })
    } catch (err) {
        res.status(500).json({ err: err.message })
    }
})

// submit a review
// POST /reviews
router.post('/', verifyToken, async (req, res) => {
    try {
        const product = await Product.findById(req.body.productId)
        if (!product) {
            return res.status(404).json({ err: 'Product not found.' })
        }

        const owner = new ObjectId(req.user._id)

        if (!product.owners.includes(owner)) {
            return res.status(403).json({ err: "Need to purchase item." })
        }

        const existingReview = product.reviews.find(review => review.author.toString() === req.user._id)
        if (existingReview) {
            return res.status(409).json({ err: "Already reviewed."})
        }

        const review = new Review({
            text: req.body.text,
            author: req.user._id,
        })

        product.reviews.push(review)
        await product.save()

        res.status(201).json({ review })
    } catch (err) {
        res.status(500).json({ err: err.message })
    }
})

// edit your review
// PUT /reviews/:reviewId
router.put('/', verifyToken, async (req, res) => {
    try {
        const products = await Product.findById(req.body.productId).populate('reviews.author', 'username')

        if (!products || products.reviews.length === 0) {
            return res.status(404).json({ err: 'No reviews found.'})
        }

        const review = products.reviews.find(review => review.author._id.toString() === req.user._id);

        if (review.author._id.toString() !== req.user._id) {
            return res.status(404).json({ err: 'No review found or not the author.'})
        }

        review.text = req.body.text || review.text

        await products.save()
        res.status(200).json({ review })
    } catch (err) {
        res.status(500).json({ err: err.message })
    }
})

// delete your review
// DELETE /:reviewId
router.delete('/', verifyToken, async (req, res) => {
    try {
        const products = await Product.findById(req.headers.productid).populate('reviews.author', 'username')

        if (!products || products.reviews.length === 0) {
            return res.status(404).json({ err: 'No reviews found.'})
        }

        const review = products.reviews.find(review => review.author._id.toString() === req.user._id);

        if (review.author._id.toString() !== req.user._id) {
            return res.status(404).json({ err: 'No review found or not the author.'})
        }

        products.reviews.remove({ _id: review._id })
        await products.save()
        res.status(200).json({ message: "Review deleted." })
    } catch (err) {
        res.status(500).json({ err: err.message })
    }
})



// export
module.exports = router