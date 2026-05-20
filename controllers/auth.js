const User = require("../models/User")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

// ========================================
// REGISTER USER
// ========================================

exports.register = async (req, res) => {

  try {

    const { name, email, password } = req.body

    // Validate fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      })
    }

    // Check existing user
    const existingUser = await User.findOne({ email })

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword
    })

    // Generate token
    const token = jwt.sign(
      {
        id: user._id
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    )

    // Send response
    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        balance: user.balance
      }
    })

  } catch (error) {

    console.log(error)

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    })

  }
}

// ========================================
// LOGIN USER
// ========================================

exports.login = async (req, res) => {

  try {

    const { email, password } = req.body

    // Validate fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      })
    }

    // Find user
    const user = await User.findOne({ email })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      })
    }

    // Compare password
    const isMatch = await bcrypt.compare(
      password,
      user.password
    )

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid password"
      })
    }

    // Generate token
    const token = jwt.sign(
      {
        id: user._id
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    )

    // Send response
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        balance: user.balance
      }
    })

  } catch (error) {

    console.log(error)

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    })

  }
}

// ========================================
// GET CURRENT USER
// ========================================

exports.getMe = async (req, res) => {

  try {

    const user = await User.findById(req.user.id).select("-password")

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      })
    }

    res.status(200).json({
      success: true,
      user
    })

  } catch (error) {

    console.log(error)

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    })

  }
}
