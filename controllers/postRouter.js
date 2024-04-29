// Import required modules
const express = require('express');
const postRouter = express.Router();
const Post = require('../models/posts');
const Member = require('../models/member')
const jwt = require('jsonwebtoken');

// POST request to create a new post
postRouter.post('/', async (req, res) => {
    const { title, description } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1]; // Extract the token from the authorization header

    try {
        // Verify the token's authenticity
        const decodedToken = jwt.verify(token, process.env.SECRET);

        // Extract the user ID from the decoded token
        const userId = decodedToken.id;

        const newPost = new Post({ title, description, author: userId });
        await newPost.save();
        res.status(201).json(newPost);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// GET request to fetch all posts
postRouter.get('/', async (req, res) => {
    try {
      const posts = await Post.find().populate('author');
      const postsWithAuthorProfile = [];

      // Iterate through each post to fetch the author's memberProfile
      for (const post of posts) {
        const authorId = post.author; // Extract the author's ID from the post
  
        // Fetch the memberProfile data for the author
        const authorProfile = await Member.findById(authorId).select('memberProfile');
  
        // Create a new object with the post data and the author's memberProfile
        const postWithProfile = {
          ...post.toObject(),
          authorId: authorId.id,
          author: authorProfile.memberProfile // Attach the author's memberProfile to the post
        };
  
        postsWithAuthorProfile.push(postWithProfile);
      }
  
      res.json(postsWithAuthorProfile);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });


// GET request to fetch a single post by ID
postRouter.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username');
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST request to add a reply to a post
postRouter.post('/:id/reply', async (req, res) => {
  // Implementation for adding a reply to a post
});

module.exports = postRouter;
