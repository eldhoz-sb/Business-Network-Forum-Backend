const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')

const memberSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  passwordHash: { type: String },
  verificationToken: { type: String },
  isVerified: {type: Boolean, default:false},
  memberProfile: 
    {
      name: { type: String },
      photo: { type: String }, 
      designation: { type: String },
      company: { type: String },
      experience: { type: Number },
      skills: { type: String }, 
      website: { type: String },
    },
    connections: [],
})

memberSchema.plugin(uniqueValidator)

memberSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = document._id ? document._id.toString() : null; // Add a check for _id
    delete returnedObject._id;
    delete returnedObject.__v;
    // the passwordHash should not be revealed
    delete returnedObject.passwordHash;
  }
});


const Member = mongoose.model('Member', memberSchema)

module.exports = Member