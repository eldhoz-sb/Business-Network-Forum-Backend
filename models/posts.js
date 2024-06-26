const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')

const postSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    createdAt: { type: Date, default: Date.now },
  });

  postSchema.plugin(uniqueValidator)
  
  const Post = mongoose.model('Post', postSchema);
  
  module.exports = Post;