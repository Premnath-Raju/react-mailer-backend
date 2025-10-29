require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const app = express();

// Environment Variables Verification
console.log('Environment Variables Check:', {
  hasEmailUser: !!process.env.EMAIL_USER,
  hasEmailPass: !!process.env.EMAIL_PASS,
  hasCareerUser: !!process.env.CAREER_USER,
  hasCareerPass: !!process.env.CAREER_PASS,
  nodeEnv: process.env.NODE_ENV
});

// CORS Configuration - Fixed (removed trailing slash)
app.use(cors({
  origin: ['https://aquamarine-dragon-83c610.netlify.app', "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request Logging Middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`, req.body);
  next();
});

// Health Check Endpoints
app.get("/", (req, res) => {
  res.json({ 
    message: "Tragard Backend is running successfully",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    service: "Tragard Email Service",
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Nodemailer transporter (Zoho configuration)
// Updated transporter configuration for Railway
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 587, // Use 587 instead of 465
  secure: false, // false for port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Bypass certificate validation issues
    ciphers: 'SSLv3'
  },
  connectionTimeout: 60000, // Increase to 60 seconds
  greetingTimeout: 60000,
  socketTimeout: 60000,
});

const careerTransporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.CAREER_USER,
    pass: process.env.CAREER_PASS,
  },
  tls: {
    rejectUnauthorized: false,
    ciphers: 'SSLv3'
  },
  connectionTimeout: 60000,
  greetingTimeout: 60000,
  socketTimeout: 60000,
});
// Verify Transporter Connections
transporter.verify(function (error, success) {
  if (error) {
    console.log('❌ Main transporter connection error:', error);
  } else {
    console.log('✅ Main transporter is ready to send emails');
  }
});

careerTransporter.verify(function (error, success) {
  if (error) {
    console.log('❌ Career transporter connection error:', error);
  } else {
    console.log('✅ Career transporter is ready to send emails');
  }
});

// API endpoint for Service Inquiry
app.post("/sendservice", async (req, res) => {
  try {
    const { name, email, phone, message, service } = req.body;
    
    // Validation
    if (!name || !email || !service) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: name, email, service" 
      });
    }

    console.log(`Processing service inquiry from ${name} for ${service}`);

    // 1️⃣ Send mail to yourself
    const adminMail = await transporter.sendMail({
      from: process.env.EMAIL_USER, // Use your email as from address
      replyTo: email, // Allow replies to go to customer
      to: process.env.EMAIL_USER,
      subject: `Service Inquiry: ${service}`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 8px; color: #000;">
          <h2 style="color: #000; text-align: center;">New Service Inquiry</h2>
    
          <table style="
            width: 80%;
            margin: 0 auto; 
            background-color: #D1E4F5;
            border-collapse: collapse;
            border: 1px solid #ddd;
            border-radius: 6px;
            overflow: hidden;
            color: #000;
          ">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Service</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${service}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Name</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Email</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Phone</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${phone || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Message</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${message || 'No message provided'}</td>
            </tr>
          </table>
    
          <p style="margin-top: 20px; color: #333; text-align: center;">
            This is an automated notification from your website's service inquiry form.
          </p>
        </div>
      `,
    });

    console.log(`Admin notification sent: ${adminMail.messageId}`);

    // 2️⃣ Send auto-reply to customer
    const customerMail = await transporter.sendMail({
      from: `"Tragard Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Thanks for contacting Tragard – ${service}`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #fff8f5; padding: 40px 30px; color: #333; max-width: 600px; margin: auto; border-radius: 8px;">
          
          <!-- Logo -->
          <div style="text-align: left; margin-bottom: 20px;">
            <img src="https://i.postimg.cc/15hVg5LR/bluicon.png" alt="Tragard Logo" style="max-width: 50px;" />
          </div>
    
          <!-- Greeting -->
          <h2 style="color: #000;">Hello ${name.toUpperCase()},</h2>
    
          <!-- Message -->
          <p>Thank you for reaching out to <strong>Tragard</strong> regarding <strong>${service.toUpperCase()}</strong>.</p>
    
          <p>We've received your inquiry and our team is currently reviewing it. You can expect to hear back from us within <strong>3 business days</strong>.</p>
    
          <!-- Button -->
          <div style="margin: 25px 0;">
            <a href="https://tragardtest.netlify.app" style="background-color: #e50914; color: #fff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px;">
              Visit Tragard
            </a>
          </div>
    
          <!-- Extra note -->
          <p style="font-size: 14px; color: #555;">
            If you have any additional questions or need immediate assistance, please feel free to reply to this email or reach us at 
            <a href="mailto:tragardsupport@gmail.com" style="color: #e50914;">tragardsupport@gmail.com</a>. We're here to help you every step of the way!
          </p>
    
          <!-- Footer Logo -->
          <div style="margin: 30px 0;">
            <img src="https://i.postimg.cc/cCKCvPcs/logo1.png" alt="Tragard Logo" style="max-width: 100px;" />
          </div>
    
          <p style="font-size: 14px; margin-top: 10px;">Best regards,<br /><strong>The Tragard Team</strong></p>
        </div>
      `
    });

    console.log(`Customer auto-reply sent: ${customerMail.messageId}`);

    res.json({ 
      success: true, 
      message: "Service inquiry sent successfully",
      inquiryId: adminMail.messageId 
    });
  } catch (error) {
    console.error("❌ Error sending service email:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to send service inquiry",
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Partnership Inquiry
app.post("/sendpartner", async (req, res) => {
  try {
    const { name, company, email, phone, location, website, partnershipNature, productService, reason } = req.body;

    // Validation
    if (!name || !email || !company) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: name, company, email" 
      });
    }

    console.log(`Processing partnership inquiry from ${name} at ${company}`);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      replyTo: email,
      to: process.env.EMAIL_USER,
      subject: `New Partner Request from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 8px; color: #000;">
          <h2 style="color: #000; text-align: center;">New Partner Request</h2>
    
          <table style="
            width: 80%;
            margin: 0 auto;
            background-color: #D1E4F5;
            border-collapse: collapse;
            border: 1px solid #ddd;
            border-radius: 6px;
            overflow: hidden;
            color: #000;
          ">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Name</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Company</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${company}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Email</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Phone</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${phone || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Location</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${location || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Website</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${website || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Nature of Partnership</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${partnershipNature || 'Not specified'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Product/Service</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${productService || 'Not specified'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Reason</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${reason || 'Not provided'}</td>
            </tr>
          </table>
    
          <p style="margin-top: 20px; color: #333; text-align: center;">
            This is an automated partner request submission from your website.
          </p>
        </div>
      `,
    });

    await transporter.sendMail({
      from: `"Tragard Partnerships" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Thank you for reaching out – Tragard Partnerships",
      html: `
    <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 30px; border-radius: 8px; color: #333; max-width: 600px; margin: auto;">
      
      <!-- Logo -->
      <div style="text-align: left; margin-bottom: 20px;">
        <img src="https://i.postimg.cc/cJSkTrss/bluicon.png" alt="Tragard Logo" style="max-width: 70px;"/>
      </div>

      <!-- Greeting -->
      <h3 style="color: #111;">Dear ${name},</h3>
      <p>We truly appreciate your interest in building a partnership with <b>Tragard</b>.</p>

      <!-- Main Message -->
      <p>
        Your request regarding <b>${partnershipNature || 'partnership'}</b> from <b>${company}</b> has been received.  
        Our team is carefully reviewing the details and will connect with you at the earliest convenience.  
      </p>

      <!-- Appreciation -->
      <p>
        At Tragard, we value meaningful collaborations, and we look forward to exploring how we can work together.  
      </p>

      <!-- CTA -->
      <div style="text-align: left; margin: 25px 0;">
        <a href="https://tragardtest.netlify.app/partnerships" 
           style="background-color: #e50914; color: #fff; padding: 12px 24px; 
                  text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
          Discover Our Partnerships
        </a>
      </div>

      <!-- Closing -->
      <p>
        Warm regards,<br/>
        <b>Tragard Partnerships Team</b>
      </p>
    </div>
  `,
    });

    res.json({ 
      success: true, 
      message: "Partnership inquiry sent successfully!" 
    });
  } catch (error) {
    console.error("❌ Partnership email error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to send partnership inquiry",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Business Consultation
app.post("/sendbusiness", async (req, res) => {
  try {
    const {
      firstName,
      companyName,
      email,
      industryType,
      service,
      contactNumber,
      address,
      message,
    } = req.body;

    // Validation
    if (!firstName || !email || !service) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: firstName, email, service" 
      });
    }

    console.log(`Processing business consultation from ${firstName} for ${service}`);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      replyTo: email,
      to: process.env.EMAIL_USER,
      subject: `Business Consultation: ${service}`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 8px; color: #000;">
          <h2 style="color: #000; text-align: center;">Business Consultation Request</h2>
    
          <table style="
            width: 80%;
            margin: 0 auto;
            background-color: #D1E4F5;
            border-collapse: collapse;
            border: 1px solid #ddd;
            border-radius: 6px;
            overflow: hidden;
            color: #000;
          ">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Full Name</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${firstName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Company Name</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${companyName || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Email</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Contact Number</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${contactNumber || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Location</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${address || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Industry Type</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${industryType || 'Not specified'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Selected Service</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${service}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Requirement</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${message || 'No specific requirements provided'}</td>
            </tr>
          </table>
    
          <p style="margin-top: 20px; color: #333; text-align: center;">
            This is an automated business consultation inquiry from your website.
          </p>
        </div>
      `,
    });

    await transporter.sendMail({
      from: `"Tragard" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Business Inquiry Received – Tragard",
      html: `
    <div style="font-family: Arial, sans-serif; background-color: #fff8f5; padding: 30px; border-radius: 8px; color: #333; max-width: 600px; margin: auto;">

      <!-- Top Logo -->
      <div style="text-align: left; margin-bottom: 20px;">
        <img src="https://i.postimg.cc/cJSkTrss/bluicon.png" alt="Tragard Logo" style="max-width: 60px;"/>
      </div>

      <!-- Greeting -->
      <h3 style="color: #111;">Hi ${firstName},</h3>
      <p>Thank you for reaching out to <b>Tragard</b> with your business inquiry.</p>

      <!-- Message -->
      <p>
        We have received your request regarding <b>${service}</b>, and our team is currently reviewing the details.  
        One of our representatives will get back to you <b>as soon as possible</b> with the next steps.
      </p>

      <!-- Button -->
      <div style="text-align: left; margin: 30px 0;">
        <a href="https://tragardtest.netlify.app/" 
           style="background-color: #e50914; color: #fff; padding: 12px 24px; 
                  text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
          Visit Tragard
        </a>
      </div>

      <!-- Support Text -->
      <p>
        If you have any immediate questions or require urgent assistance, please feel free to reply to this email or contact us directly at 
        <a href="mailto:tragardsupport@gmail.com" style="color:#e50914; text-decoration:none;">tragardsupport@gmail.com</a>.  
        Our team is always here to support your business needs.
      </p>

      <!-- Footer Logo -->
      <div style="margin-top: 20px; text-align: left;">
        <img src="https://i.postimg.cc/RVxtWfGV/logo1.png" alt="Tragard Footer Logo" style="max-width: 120px;"/>
      </div>

      <!-- Closing -->
      <p style="margin-top: 20px;">
        Best regards,<br/>
        <b>The Tragard Business Team</b>
      </p>

    </div>
  `
    });

    res.json({ 
      success: true, 
      message: "Business consultation request sent successfully!"
    });
  } catch (error) {
    console.error("❌ Business email error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to send business consultation request",
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Career Application - FIXED (removed duplicate response)
app.post("/career", upload.single("resume"), async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      role,
      type,
      location,
      linkedin,
      portfolio,
      message,
    } = req.body;

    // Validation
    if (!fullName || !email || !role) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: fullName, email, role" 
      });
    }

    console.log(`Processing career application from ${fullName} for ${role}`);

    // Send mail with attachment
    await careerTransporter.sendMail({
      from: process.env.CAREER_USER,
      replyTo: email,
      to: process.env.CAREER_USER,
      subject: `New Career Application - ${role}`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 8px; color: #000;">
          <h2 style="color: #000; text-align: center;">New Career Application</h2>
    
          <table style="
            width: 80%;
            margin: 0 auto;
            background-color: #D1E4F5;
            border-collapse: collapse;
            border: 1px solid #ddd;
            border-radius: 6px;
            overflow: hidden;
            color: #000;
          ">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Name</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${fullName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Email</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Phone</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${phone || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Role</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${role}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Applying For</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${type || 'Not specified'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Location</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${location || 'Not specified'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>LinkedIn</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${linkedin ? `<a href="${linkedin}" style="color: #000;">${linkedin}</a>` : 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Portfolio</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${portfolio ? `<a href="${portfolio}" style="color: #000;">${portfolio}</a>` : 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Message</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${message || 'No additional message'}</td>
            </tr>
          </table>
    
          <p style="margin-top: 20px; color: #333; text-align: center;">
            ${req.file ? 'Resume/CV is attached to this application.' : 'No resume attached.'}
          </p>
        </div>
      `,
      attachments: req.file
        ? [
          {
            filename: req.file.originalname,
            content: req.file.buffer,
            contentType: req.file.mimetype
          },
        ]
        : [],
    });

    // Auto-reply to applicant
    await careerTransporter.sendMail({
      from: `"Tragard HR" <${process.env.CAREER_USER}>`,
      to: email,
      subject: `Application Received – ${role} at Tragard`,
      html: `
    <div style="font-family: Arial, sans-serif; background-color: #fff8f5; padding: 30px; border-radius: 8px; color: #333; max-width: 600px; margin: auto;">

      <!-- Top Logo -->
      <div style="text-align: left; margin-bottom: 20px;">
        <img src="https://i.postimg.cc/cJSkTrss/bluicon.png" alt="Tragard Logo" style="max-width: 60px;"/>
      </div>

      <!-- Greeting -->
      <p style="font-size: 16px;">Hi ${fullName},</p>

      <!-- Main Message -->
      <p>
        Thank you for applying for the position of <b>${role}</b> at <b>Tragard</b>.  
        We've received your application and our HR team will carefully review your profile. 
      </p>
      <p>
        If your qualifications match our requirements, we'll reach out to you for the next steps.  
        We truly appreciate your interest in joining the Tragard family.
      </p>

      <!-- Button -->
      <div style="text-align: left; margin: 30px 0;">
        <a href="https://tragardtest.netlify.app/" 
           style="background-color: #e50914; color: #fff; padding: 12px 24px; 
                  text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
          Explore Careers
        </a>
      </div>

      <!-- Closing -->
      <p>
        Best regards,<br/>
        <b>Tragard HR Team</b>
      </p>

      <!-- Footer -->
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;"/>
      <p style="font-size: 12px; color: #777; text-align: center;">
        This is an automated acknowledgment from Tragard HR. Please do not reply directly to this email.
      </p>
    </div>
  `
    });

    // FIXED: Only one response
    res.json({ 
      success: true, 
      message: "Application submitted successfully! Acknowledgement sent." 
    });

  } catch (error) {
    console.error("❌ Career application error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to submit application",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Contact Form
app.post("/contact", async (req, res) => {
  const { fullName, phone, email, subject, Dropdown, message } = req.body;

  try {
    // Validation
    if (!fullName || !email || !subject) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: fullName, email, subject" 
      });
    }

    console.log(`Processing contact form from ${fullName}`);

    // Send email to admin
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      replyTo: email,
      to: process.env.EMAIL_USER,
      subject: `New Contact Form: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 8px; color: #000;">
          <h2 style="text-align: center; color: #000;">New Contact Form Submission</h2>
    
          <table style="
            width: 80%;
            margin: 0 auto;
            background-color: #D1E4F5;
            border-collapse: collapse;
            border: 1px solid #ddd;
            border-radius: 6px;
            overflow: hidden;
            color: #000;
          ">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Name</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${fullName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Phone</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${phone || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Email</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Heard From</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${Dropdown || 'Not specified'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Message</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${message || 'No message provided'}</td>
            </tr>
          </table>
    
          <p style="margin-top: 20px; color: #333; text-align: center;">
            This message was submitted through the website contact form.
          </p>
        </div>
      `
    });

    // Auto-reply to USER
    await transporter.sendMail({
      from: `"Tragard Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "We've received your message – Tragard",
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 25px; border-radius: 8px; color: #333; max-width: 600px; margin: auto;">
          
          <!-- Logo -->
          <div style="text-align: left; margin-bottom: 20px;">
            <img src="https://i.postimg.cc/cJSkTrss/bluicon.png" alt="Tragard Logo" style="max-width: 70px;"/>
          </div>

          <!-- Greeting -->
          <h3 style="color:#111;">Hello ${fullName},</h3>
          <p>Thank you for contacting <b>Tragard</b>. We've received your message regarding <b>${subject}</b>.</p>

          <!-- Main -->
          <p>
            Our team will review your request and get back to you as soon as possible.  
            In the meantime, if your query is urgent, you can reach us directly at 
            <a href="mailto:tragardsupport@gmail.com" style="color:#e50914; text-decoration:none;">tragardsupport@gmail.com</a>.
          </p>

          <!-- Footer Logo -->
      <div style="margin-top: 20px; text-align: left;">
        <img src="https://i.postimg.cc/RVxtWfGV/logo1.png" alt="Tragard Footer Logo" style="max-width: 120px;"/>
      </div>
          <!-- Closing -->
          <p style="margin-top: 25px;">
            Best regards,<br/>
            <b>Tragard Support Team</b>
          </p>
        </div>
      `
    });

    res.status(200).json({ 
      success: true, 
      message: "Contact form submitted successfully & auto-reply sent" 
    });
  } catch (error) {
    console.error("❌ Contact form error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to send message",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: "Route not found" 
  });
});

// Error Handling Middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    message: "Internal server error",
    error: process.env.NODE_ENV === 'development' ? error.message : 'Contact support'
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Tragard Backend running on port ${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ CORS enabled for: ${['https://aquamarine-dragon-83c610.netlify.app', 'http://localhost:5173'].join(', ')}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
});