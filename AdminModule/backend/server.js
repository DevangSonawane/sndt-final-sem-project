require("dotenv").config();
console.log("SERVER FILE LOADED");

console.log("META_APP_ID =", process.env.META_APP_ID);

const express = require("express");
const cors = require("cors");
const db = require("./db");
const multer = require("multer");
const path = require("path");

const axios = require("axios");
const session = require("express-session");
const nodemailer = require("nodemailer");
const cron = require("node-cron");

const app = express();

/* ===== EMAIL CONFIG ===== */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "your-email@gmail.com", // Replace with your email
    pass: process.env.EMAIL_PASS || "your-app-password", // Replace with your app password
  },
});

/* ===== EMAIL HELPER FUNCTION ===== */
function sendEmailNotification(post) {
  const recipient = post.notification_email || "ankitagkjha@gmail.com";
  const mailOptions = {
    from: process.env.EMAIL_USER || "your-email@gmail.com",
    to: recipient,
    subject: "New Post Scheduled / Created",
    text: `Hello,
    
A new post has been created/scheduled:

Client: ${post.customer_name}
Project: ${post.project_name}
Platform: ${post.platform}
Status: ${post.status}
Scheduled Date: ${post.schedule_date}

Please check the Post Pilot app for more details.

Best regards,
Post Pilot Team`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Error sending email:", error);
    } else {
      console.log("Email sent automatically: " + info.response);
    }
  });
}

/* ===== MANUAL EMAIL TRIGGER ===== */

app.post("/sendEmail/:id", (req, res) => {
  const contentId = req.params.id;

  const sql = `SELECT * FROM content WHERE content_id = ?`;

  db.query(sql, [contentId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = results[0];
    const recipient = post.notification_email || "ankitagkjha@gmail.com";

    const mailOptions = {
      from: process.env.EMAIL_USER || "your-email@gmail.com",
      to: recipient,
      subject: "Scheduled Post Reminder (Manual Trigger)",
      text: `Hello,
      
This is a manual reminder for the following post:

Client: ${post.customer_name}
Project: ${post.project_name}
Platform: ${post.platform}
Status: ${post.status}
Scheduled Date: ${post.schedule_date}

Please check the Post Pilot app for more details.

Best regards,
Post Pilot Team`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error);
        return res.status(500).json({ error: "Failed to send email" });
      } else {
        console.log("Email sent: " + info.response);
        res.json({ success: true, message: "Email sent successfully" });
      }
    });
  });
});

/* ===== MIDDLEWARES ===== */

app.use(cors({
  origin: ["http://127.0.0.1:5500", "http://localhost:5500", "http://localhost:3000"],   // Allow both standard frontend ports
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

/* ===== SESSION MIDDLEWARE (CORRECT PLACE) ===== */

app.use(session({
  secret: "mysupersecret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,      // localhost ke liye false
    httpOnly: true,
    sameSite: "lax"
  }
  })
);

/* ===== STATIC FOLDER ===== */

app.use("/uploads", express.static("uploads"));

/* ================= MULTER STORAGE ================= */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },

  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
});
/* ===== TEST ROUTE ===== */
app.get("/", (req, res) => {
  res.send("API WORKING");
});

/* ================= EMPLOYEES ================= */

app.get("/employees", (req, res) => {
  db.query("SELECT * FROM employees", (err, result) => {
    if (err) return res.status(500).send(err);
    res.send(result);
  });
});


/* ================= CUSTOMERS ================= */

app.get("/customers", (req, res) => {
  db.query("SELECT * FROM customers", (err, result) => {
    if (err) return res.status(500).send(err);
    res.send(result);
  });
});

app.post("/customers", (req, res) => {
  const { name, custId, password } = req.body;

  // Check if ID or password already exists
  db.query(
    "SELECT * FROM customers WHERE cust_id=? OR password=?",
    [custId, password],
    (err, result) => {
      if (err) return res.status(500).send("Database error");
      if (result.length > 0) {
        const existsId = result.some((r) => r.cust_id === custId);
        const existsPassword = result.some((r) => r.password === password);
        let msg = "Already exists: ";
        if (existsId && existsPassword) msg += "ID and Password";
        else if (existsId) msg += "ID";
        else if (existsPassword) msg += "Password";
        return res.status(400).send(msg);
      }

      // If no duplicates, insert
      db.query(
        "INSERT INTO customers (cust_name, cust_id, password) VALUES (?,?,?)",
        [name, custId, password],
        (err) => {
          if (err) return res.status(500).send("Database error");
          res.send("Customer added 🎉!!!");
        }
      );
    }
  );
});

/* ================= ASSIGN ================= */

app.post("/assign", (req, res) => {
  const { empId, customers } = req.body;

  db.query(
    "UPDATE employees SET assigned_customers=? WHERE emp_id=?",
    [customers.join(", "), empId],
    (err) => {
      if (err) return res.status(500).send(err);
      res.send("Assigned");
    }
  );
});

app.delete("/employees/:empId", (req, res) => {
  db.query(
    "DELETE FROM employees WHERE emp_id=?",
    [req.params.empId],
    (err) => {
      if (err) return res.status(500).send(err);
      res.send("Employee deleted successfully 🎉!!!");
    }
  );
});

app.delete("/customers/:custId", (req, res) => {
  const custId = req.params.custId;

  // 1️⃣ Get customer name
  db.query(
    "SELECT cust_name FROM customers WHERE cust_id=?",
    [custId],
    (err, result) => {
      if (err) return res.status(500).send("Database error");

      if (result.length === 0) {
        return res.status(404).send("Customer not found");
      }

      const custName = result[0].cust_name;

      // 2️⃣ Remove customer from employees.assigned_customers
      db.query(
        "SELECT emp_id, assigned_customers FROM employees",
        (err, employees) => {
          if (err) return res.status(500).send("Database error");

          employees.forEach((emp) => {
            if (emp.assigned_customers) {
              const updated = emp.assigned_customers
                .split(",")
                .map((c) => c.trim())
                .filter((c) => c !== custName)
                .join(", ");

              db.query(
                "UPDATE employees SET assigned_customers=? WHERE emp_id=?",
                [updated, emp.emp_id]
              );
            }
          });

          // 3️⃣ Finally delete customer
          db.query("DELETE FROM customers WHERE cust_id=?", [custId], (err) => {
            if (err) return res.status(500).send("Database error");
            res.send("Customer deleted and unassigned successfully 🎉!!!");
          });
        }
      );
    }
  );
});

/* 🔐 ADMIN LOGIN */
app.post("/login", (req, res) => {
  console.log("LOGIN HIT:", req.body);
  const { username, password } = req.body;

  // ADMIN CHECK
  if (username === "admin2026" && password === "admin2026") {
    req.session.role = "admin";
    return res.json({ role: "admin" });
  }

  // EMPLOYEE CHECK
  const sql = "SELECT * FROM employees WHERE emp_name=? AND password=?";

  db.query(sql, [username, password], (err, result) => {
    if (err) return res.status(500).json({ role: "error" });

    if (result.length > 0) {
return res.json({
  role: "user",
  employeeId: result[0].emp_id,
  name: result[0].emp_name,
  assigned: result[0].assigned_customers
});
    } else {
      return res.json({ role: "invalid" });
    }
  });
});

/* ===== VERIFY USER FOR FORGOT PASSWORD ===== */

app.post("/verify-user", (req, res) => {
  const { username, userid } = req.body;

  db.query(
    "SELECT * FROM employees WHERE emp_name=? AND emp_id=?",
    [username, userid],
    (err, result) => {
      if (err) return res.status(500).json({ success: false });

      if (result.length > 0) {
        res.json({ success: true });
      } else {
        res.json({ success: false });
      }
    }
  );
});
 
/* ===== CHANGE PASSWORD ===== */

app.put("/change-password", (req, res) => {
  const { empId, password } = req.body;

  db.query(
    "UPDATE employees SET password=? WHERE emp_id=?",
    [password, empId],
    (err) => {
      if (err) return res.status(500).send("Database error");

      res.send("Password updated");
    }
  );
});

/*==================NOT ASSIGN============*/
app.put("/unassign/:empId", (req, res) => {
  const empId = req.params.empId;

  db.query(
    "UPDATE employees SET assigned_customers=NULL WHERE emp_id=?",
    [empId],
    (err) => {
      if (err) return res.status(500).send("Database error");
      res.send("All customers unassigned successfully");
    }
  );
});

/* ================= GET CUSTOMER DETAILS ================= */

app.get("/customer-details/:custId", (req, res) => {
  const custId = req.params.custId;

  const sql = `
    SELECT 
      project_name AS title,
      project_caption AS caption,
      platform,
      status,
      schedule_date
    FROM content
    WHERE customer_name = (
      SELECT cust_name FROM customers WHERE cust_id = ?
    )
    ORDER BY schedule_date DESC
  `;

  db.query(sql, [custId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Database error");
    }

    res.json(result);
  });
});

/* ================= GET EMPLOYEE DATA ================= */
app.get("/employee/:id", (req, res) => {

  const empId = req.params.id;

  db.query(
    "SELECT assigned_customers FROM employees WHERE emp_id=?",
    [empId],
    (err, result) => {

      if (err) return res.status(500).send(err);
      if (result.length === 0) return res.json({ customers: [] });

      const assigned = result[0].assigned_customers;

      if (!assigned) return res.json({ customers: [] });

      // 🔥 Convert "Tata, HDFC" → ["Tata","HDFC"]
      const names = assigned.split(",").map(c => c.trim());

      // 🔥 Ab customers table se full data nikaalo
      db.query(
        "SELECT cust_id, cust_name FROM customers WHERE cust_name IN (?)",
        [names],
        (err, customers) => {

          if (err) return res.status(500).send(err);

          res.json({ customers });
        }
      );

    }
  );
});

/* ================= CREATE POST (ONLY ONE ROUTE NOW) ================= */

app.post("/addPost", (req, res) => {

  console.log("ADD POST HIT");
  console.log("BODY RECEIVED:", req.body);

  const { customer_name, title, caption, platform, status, post_date, notification_email } = req.body;

  if (!customer_name || customer_name.trim() === "") {
    console.log("Customer missing");
    return res.status(400).json({ error: "Customer not selected" });
  }

  const sql = `
    INSERT INTO content
    (customer_name, project_name, project_caption, platform, status, schedule_date, notification_email)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [customer_name.trim(), title, caption, platform, status, post_date, notification_email],
    (err, result) => {
      if (err) {
        console.log("INSERT ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      console.log("POST INSERTED ID:", result.insertId);

      // 🔥 AUTO-SEND EMAIL
      sendEmailNotification({
        customer_name: customer_name.trim(),
        project_name: title,
        platform,
        status,
        schedule_date: post_date,
        notification_email
      });

      res.json({ success: true });
    }
  );
});

/* ================= ADD POST WITH MEDIA ================= */

app.post("/addPostWithMedia", upload.array("media"), (req, res) => {
  const { title, caption, platform, status, post_date, customer_id, notification_email } = req.body;

  db.query(
    "INSERT INTO content (title, caption, platform, status, post_date, customer_id, notification_email) VALUES (?,?,?,?,?,?,?)",

    [title, caption, platform, status, post_date, customer_id, notification_email],

    (err, result) => {
      if (err) {
        console.log(err);
        return res.sendStatus(500);
      }

      const postId = result.insertId;

      if (req.files) {
        req.files.forEach((file) => {
          db.query(
            "INSERT INTO post_media (post_id, media_path) VALUES (?,?)",
            [postId, file.filename]
          );
        });
      }

      // 🔥 AUTO-SEND EMAIL (Need to fetch customer name first, or pass it from frontend)
      // Since we only have customer_id here, let's fetch customer name
      db.query("SELECT cust_name FROM customers WHERE cust_id = ?", [customer_id], (err, rows) => {
        const custName = (rows && rows.length > 0) ? rows[0].cust_name : "Unknown Client";
        
        sendEmailNotification({
            customer_name: custName,
            project_name: title,
            platform,
            status,
            schedule_date: post_date,
            notification_email
        });
      });

      res.json({ success: true });
    }
  );
});

/* ================= LOAD POSTS (CLIENT FILTER FIX ADDED) ================= */

app.get("/posts", (req, res) => {

  const customerName = req.query.customer_name;

  console.log("Customer Received:", customerName);

  const sql = `
    SELECT 
      content_id,
      project_name AS title,
      project_caption AS caption,
      platform,
      status,
      schedule_date,
      notification_email
    FROM content
    WHERE LOWER(TRIM(customer_name)) = LOWER(TRIM(?))
    ORDER BY schedule_date DESC
  `;

  db.query(sql, [customerName], (err, result) => {

    if (err) {
      console.log("🔥🔥🔥 FULL DB ERROR BELOW 🔥🔥🔥");
      console.log(err);
      return res.status(200).json(err);
    }

    console.log("RESULT:", result);

    res.json(result);

  });

});

/* ================= ANALYTICS ================= */

app.get("/analytics", (req, res) => {
  const customerName = req.query.customer_name;
  
  let sql = `
    SELECT 
      platform, 
      DATE(schedule_date) as post_date, 
      COUNT(*) as count 
    FROM content 
  `;
  
  const params = [];
  
  if (customerName) {
    sql += ` WHERE LOWER(TRIM(customer_name)) = LOWER(TRIM(?)) `;
    params.push(customerName);
  }
  
  sql += ` GROUP BY platform, DATE(schedule_date) ORDER BY post_date DESC`;

  db.query(sql, params, (err, result) => {
    if (err) {
      console.log("Analytics Error:", err);
      return res.status(500).json(err);
    }
    res.json(result);
  });
});

/* ================= DELETE POST ================= */

app.delete("/deletePost/:id", (req, res) => {
  db.query("DELETE FROM content WHERE content_id=?", [req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true });
  });
});

/* ================= UPDATE POST ================= */

app.put("/updatePost/:id", (req, res) => {
  const { title, caption, platform, status, post_date, notification_email } = req.body;

  db.query(
    `UPDATE content 
     SET project_name=?, project_caption=?, platform=?, status=?, schedule_date=?, notification_email=?
     WHERE content_id=?`,
    [title, caption, platform, status, post_date, notification_email, req.params.id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ success: true });
    }
  );
});
/* ================= CONNECT INSTAGRAM ================= */

app.get("/connectInstagram", (req, res) => {
  const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.META_APP_ID}&redirect_uri=${process.env.META_REDIRECT_URI}&scope=pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish&response_type=code`;

  res.redirect(url);
});

/* ================= CONNECT FACEBOOK ================= */

app.get("/connectFacebook", (req, res) => {
  const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.META_APP_ID}&redirect_uri=${process.env.META_REDIRECT_URI}&scope=pages_show_list,pages_manage_posts&response_type=code`;

  res.redirect(url);
});
/* ================= META CALLBACK ================= */

/* ================= META CALLBACK ================= */

app.get("/auth/meta/callback", async (req, res) => {
  const code = req.query.code;

  if (!req.session.employeeId) {
    return res.send("Session expired. Login again.");
  }

  try {
    const tokenRes = await axios.get(
      "https://graph.facebook.com/v18.0/oauth/access_token",
      {
        params: {
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          redirect_uri: process.env.META_REDIRECT_URI,
          code: code,
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    const userRes = await axios.get("https://graph.facebook.com/me", {
      params: {
        access_token: accessToken,
      },
    });

    const socialId = userRes.data.id;

    /* SAVE IN DATABASE */

    db.query(
      `INSERT INTO social_accounts
      (employee_id, platform, social_id, access_token)
      VALUES (?, ?, ?, ?)`,

      [req.session.employeeId, "meta", socialId, accessToken]
    );

    res.redirect("/UserModule/user.html");
  } catch (err) {
    console.log(err);

    res.send("Connection failed");
  }
});


// ===== GET CONTENT BY CLIENT =====
app.get("/content/:customer", (req, res) => {

  const customerName = req.params.customer;

  const sql = `
    SELECT * FROM content
    WHERE customer_name = ?
    ORDER BY content_id DESC
  `;

  db.query(sql, [customerName], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }

    res.json(result);
  });
});

/* ================= SERVER ================= */

app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
}); 
