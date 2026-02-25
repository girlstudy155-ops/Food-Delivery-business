import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { query } from "./db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";

const JWT_SECRET = process.env.SESSION_SECRET || "food-delivery-secret-2024";
const DELIVERY_CHARGE = 2.99;
const TAX_RATE = 0.08;

// Multer setup for image uploads
const uploadDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Auth middleware
function authMiddleware(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function adminMiddleware(req: Request, res: Response, next: Function) {
  authMiddleware(req, res, () => {
    if ((req as any).user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  });
}

async function seedAdmin() {
  try {
    const existing = await query("SELECT id FROM users WHERE email = 'admin@gmail.com'");
    if (existing.rows.length === 0) {
      const hashed = await bcrypt.hash("123", 10);
      await query(
        "INSERT INTO users (full_name, email, password, role, is_active) VALUES ($1, $2, $3, $4, $5)",
        ["Admin", "admin@gmail.com", hashed, "admin", true]
      );
      console.log("Default admin created: admin@gmail.com / 123");
    }
  } catch (err) {
    console.error("Seed admin error:", err);
  }
}

async function seedSampleData() {
  try {
    // Seed categories if empty
    const cats = await query("SELECT COUNT(*) as count FROM categories");
    if (parseInt(cats.rows[0].count) === 0) {
      await query(`INSERT INTO categories (name, is_active) VALUES 
        ('Pizza', true), ('Burgers', true), ('Sushi', true), ('Pasta', true), 
        ('Salads', true), ('Desserts', true), ('Drinks', true), ('Breakfast', true)`);
    }

    // Seed banners if empty
    const banners = await query("SELECT COUNT(*) as count FROM banners");
    if (parseInt(banners.rows[0].count) === 0) {
      await query(`INSERT INTO banners (title, image, is_active, sort_order) VALUES 
        ('Free Delivery on First Order!', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', true, 1),
        ('50% Off This Weekend', 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&q=80', true, 2),
        ('New Summer Menu', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80', true, 3)`);
    }

    // Seed products if empty
    const prods = await query("SELECT COUNT(*) as count FROM products");
    if (parseInt(prods.rows[0].count) === 0) {
      const catRows = await query("SELECT id, name FROM categories");
      const catMap: Record<string, number> = {};
      catRows.rows.forEach((r: any) => { catMap[r.name] = r.id; });

      await query(`INSERT INTO products (name, description, category_id, price_small, price_medium, price_large, image, is_highlighted, is_active) VALUES 
        ('Margherita Pizza', 'Classic pizza with fresh mozzarella, tomato sauce and basil', $1, 8.99, 12.99, 16.99, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80', true, true),
        ('Pepperoni Pizza', 'Loaded with premium pepperoni and melted cheese', $1, 9.99, 13.99, 17.99, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&q=80', true, true),
        ('Classic Burger', 'Juicy beef patty with lettuce, tomato, onion and special sauce', $2, 7.99, 10.99, 13.99, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80', true, true),
        ('BBQ Bacon Burger', 'Smoky BBQ sauce, crispy bacon, cheddar on a brioche bun', $2, 9.99, 12.99, 15.99, 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&q=80', false, true),
        ('Salmon Roll', 'Fresh salmon, avocado and cucumber in premium nori', $3, 10.99, 14.99, 18.99, 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400&q=80', true, true),
        ('Dragon Roll', 'Shrimp tempura topped with avocado and spicy mayo', $3, 12.99, 16.99, 21.99, 'https://images.unsplash.com/photo-1617196034096-2186592926b4?w=400&q=80', false, true),
        ('Spaghetti Carbonara', 'Creamy egg sauce, guanciale and pecorino romano', $4, 8.99, 11.99, 14.99, 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400&q=80', false, true),
        ('Penne Arrabbiata', 'Spicy tomato sauce with garlic and fresh herbs', $4, 7.99, 10.99, 13.99, 'https://images.unsplash.com/photo-1600803907087-f56d462fd26b?w=400&q=80', false, true),
        ('Caesar Salad', 'Crisp romaine, parmesan, croutons and house caesar dressing', $5, 6.99, 9.99, 12.99, 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&q=80', false, true),
        ('Chocolate Lava Cake', 'Warm chocolate cake with molten center and vanilla ice cream', $6, 5.99, 7.99, 9.99, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&q=80', true, true),
        ('Fresh Lemonade', 'Freshly squeezed lemon juice with mint and honey', $7, 2.99, 4.49, 5.99, 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?w=400&q=80', false, true),
        ('Pancake Stack', 'Fluffy buttermilk pancakes with maple syrup and berries', $8, 7.99, 10.99, 13.99, 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80', true, true)`,
        [catMap['Pizza'], catMap['Burgers'], catMap['Sushi'], catMap['Pasta'], catMap['Salads'], catMap['Desserts'], catMap['Drinks'], catMap['Breakfast']]
      );
    }

    // Seed coupons if empty
    const cpns = await query("SELECT COUNT(*) as count FROM coupons");
    if (parseInt(cpns.rows[0].count) === 0) {
      await query(`INSERT INTO coupons (name, description, code, discount_type, discount_value, minimum_order, expiry_date, is_active) VALUES 
        ('Welcome Offer', '20% off your first order', 'WELCOME20', 'percentage', 20, 15, NOW() + INTERVAL '30 days', true),
        ('Flat $5 Off', 'Get $5 off any order above $25', 'SAVE5', 'fixed', 5, 25, NOW() + INTERVAL '60 days', true),
        ('Weekend Special', '15% off this weekend only', 'WEEKEND15', 'percentage', 15, 10, NOW() + INTERVAL '7 days', true)`);
    }
  } catch (err) {
    console.error("Seed data error:", err);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  await seedAdmin();
  await seedSampleData();

  // Serve uploaded images
  app.use("/uploads", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  }, require("express").static(uploadDir));

  // ==================== AUTH ROUTES ====================

  app.post("/api/auth/register", upload.single("profile_image"), async (req, res) => {
    try {
      const { full_name, email, password, address, phone, device_id, remember_me } = req.body;
      if (!full_name || !email || !password || !address || !phone) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Check email unique
      const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Check device_id if remember_me
      if (remember_me === "true" && device_id) {
        const deviceCheck = await query("SELECT id FROM users WHERE device_id = $1", [device_id]);
        if (deviceCheck.rows.length > 0) {
          return res.status(400).json({ message: "An account is already registered on this device" });
        }
      }

      const hashed = await bcrypt.hash(password, 10);
      const profile_image = req.file ? `/uploads/${req.file.filename}` : null;

      const result = await query(
        "INSERT INTO users (full_name, email, password, address, phone, profile_image, device_id, remember_me, role, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, full_name, email, address, phone, profile_image, role",
        [full_name, email, hashed, address, phone, profile_image, device_id || null, remember_me === "true", "user", true]
      );
      const user = result.rows[0];
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });

      res.json({ token, user });
    } catch (err: any) {
      console.error("Register error:", err);
      res.status(500).json({ message: err.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });

      const result = await query("SELECT * FROM users WHERE email = $1", [email]);
      if (result.rows.length === 0) return res.status(401).json({ message: "Invalid credentials" });

      const user = result.rows[0];
      if (!user.is_active) return res.status(403).json({ message: "Account is deactivated" });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ message: "Invalid credentials" });

      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
      const { password: _, ...userWithoutPwd } = user;

      res.json({ token, user: userWithoutPwd });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ message: err.message || "Login failed" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const result = await query(
        "SELECT id, full_name, email, address, phone, profile_image, role, is_active FROM users WHERE id = $1",
        [userId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== BANNERS ====================

  app.get("/api/banners", async (req, res) => {
    try {
      const result = await query("SELECT * FROM banners WHERE is_active = true ORDER BY sort_order ASC");
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/banners", adminMiddleware, upload.single("image"), async (req, res) => {
    try {
      const { title, link, sort_order } = req.body;
      const image = req.file ? `/uploads/${req.file.filename}` : req.body.image;
      if (!image) return res.status(400).json({ message: "Image required" });
      const result = await query(
        "INSERT INTO banners (title, image, link, sort_order, is_active) VALUES ($1, $2, $3, $4, true) RETURNING *",
        [title, image, link || null, sort_order || 0]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/admin/banners/:id", adminMiddleware, async (req, res) => {
    try {
      await query("DELETE FROM banners WHERE id = $1", [req.params.id]);
      res.json({ message: "Banner deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== CATEGORIES ====================

  app.get("/api/categories", async (req, res) => {
    try {
      const result = await query("SELECT * FROM categories WHERE is_active = true ORDER BY id ASC");
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/categories", adminMiddleware, async (req, res) => {
    try {
      const result = await query("SELECT * FROM categories ORDER BY id ASC");
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/categories", adminMiddleware, upload.single("image"), async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ message: "Name required" });
      const image = req.file ? `/uploads/${req.file.filename}` : req.body.image || null;
      const result = await query(
        "INSERT INTO categories (name, image, is_active) VALUES ($1, $2, true) RETURNING *",
        [name, image]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/admin/categories/:id", adminMiddleware, upload.single("image"), async (req, res) => {
    try {
      const { name, is_active } = req.body;
      const image = req.file ? `/uploads/${req.file.filename}` : req.body.image;
      const updates: string[] = [];
      const values: unknown[] = [];
      let i = 1;
      if (name !== undefined) { updates.push(`name = $${i++}`); values.push(name); }
      if (image !== undefined) { updates.push(`image = $${i++}`); values.push(image); }
      if (is_active !== undefined) { updates.push(`is_active = $${i++}`); values.push(is_active === "true" || is_active === true); }
      if (updates.length === 0) return res.status(400).json({ message: "Nothing to update" });
      values.push(req.params.id);
      const result = await query(`UPDATE categories SET ${updates.join(", ")} WHERE id = $${i} RETURNING *`, values);
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/admin/categories/:id", adminMiddleware, async (req, res) => {
    try {
      await query("DELETE FROM categories WHERE id = $1", [req.params.id]);
      res.json({ message: "Category deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== PRODUCTS ====================

  app.get("/api/products", async (req, res) => {
    try {
      const { category_id, highlighted } = req.query;
      let sql = `SELECT p.*, c.name as category_name FROM products p 
                 LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_active = true`;
      const params: unknown[] = [];
      let idx = 1;
      if (category_id) { sql += ` AND p.category_id = $${idx++}`; params.push(category_id); }
      if (highlighted === "true") { sql += ` AND p.is_highlighted = true`; }
      sql += " ORDER BY p.id ASC";
      const result = await query(sql, params);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const result = await query(
        "SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = $1",
        [req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "Product not found" });
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/products", adminMiddleware, async (req, res) => {
    try {
      const result = await query(
        "SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.id ASC"
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/products", adminMiddleware, upload.single("image"), async (req, res) => {
    try {
      const { name, description, category_id, price_small, price_medium, price_large, is_highlighted } = req.body;
      if (!name) return res.status(400).json({ message: "Name required" });
      const image = req.file ? `/uploads/${req.file.filename}` : req.body.image || null;
      const result = await query(
        `INSERT INTO products (name, description, category_id, price_small, price_medium, price_large, image, is_highlighted, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING *`,
        [name, description || null, category_id || null, price_small || 0, price_medium || 0, price_large || 0, image, is_highlighted === "true" || is_highlighted === true]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/admin/products/:id", adminMiddleware, upload.single("image"), async (req, res) => {
    try {
      const { name, description, category_id, price_small, price_medium, price_large, is_highlighted, is_active } = req.body;
      const image = req.file ? `/uploads/${req.file.filename}` : req.body.image;
      const updates: string[] = [];
      const values: unknown[] = [];
      let i = 1;
      if (name !== undefined) { updates.push(`name = $${i++}`); values.push(name); }
      if (description !== undefined) { updates.push(`description = $${i++}`); values.push(description); }
      if (category_id !== undefined) { updates.push(`category_id = $${i++}`); values.push(category_id); }
      if (price_small !== undefined) { updates.push(`price_small = $${i++}`); values.push(price_small); }
      if (price_medium !== undefined) { updates.push(`price_medium = $${i++}`); values.push(price_medium); }
      if (price_large !== undefined) { updates.push(`price_large = $${i++}`); values.push(price_large); }
      if (image !== undefined) { updates.push(`image = $${i++}`); values.push(image); }
      if (is_highlighted !== undefined) { updates.push(`is_highlighted = $${i++}`); values.push(is_highlighted === "true" || is_highlighted === true); }
      if (is_active !== undefined) { updates.push(`is_active = $${i++}`); values.push(is_active === "true" || is_active === true); }
      if (updates.length === 0) return res.status(400).json({ message: "Nothing to update" });
      values.push(req.params.id);
      const result = await query(`UPDATE products SET ${updates.join(", ")} WHERE id = $${i} RETURNING *`, values);
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/admin/products/:id", adminMiddleware, async (req, res) => {
    try {
      await query("DELETE FROM products WHERE id = $1", [req.params.id]);
      res.json({ message: "Product deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== COUPONS ====================

  app.post("/api/coupons/validate", async (req, res) => {
    try {
      const { code, subtotal } = req.body;
      if (!code) return res.status(400).json({ message: "Coupon code required" });
      const result = await query(
        "SELECT * FROM coupons WHERE code = $1 AND is_active = true AND (expiry_date IS NULL OR expiry_date > NOW())",
        [code.toUpperCase()]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "Invalid or expired coupon" });
      const coupon = result.rows[0];
      if (subtotal && parseFloat(subtotal) < parseFloat(coupon.minimum_order)) {
        return res.status(400).json({ message: `Minimum order $${coupon.minimum_order} required for this coupon` });
      }
      res.json(coupon);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/coupons", adminMiddleware, async (req, res) => {
    try {
      const result = await query("SELECT * FROM coupons ORDER BY id ASC");
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/coupons", adminMiddleware, async (req, res) => {
    try {
      const { name, description, code, discount_type, discount_value, minimum_order, expiry_date } = req.body;
      if (!name || !code || !discount_value) return res.status(400).json({ message: "Name, code and discount required" });
      const result = await query(
        "INSERT INTO coupons (name, description, code, discount_type, discount_value, minimum_order, expiry_date, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING *",
        [name, description || null, code.toUpperCase(), discount_type || "percentage", discount_value, minimum_order || 0, expiry_date || null]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/admin/coupons/:id", adminMiddleware, async (req, res) => {
    try {
      const { name, description, code, discount_type, discount_value, minimum_order, expiry_date, is_active } = req.body;
      const updates: string[] = [];
      const values: unknown[] = [];
      let i = 1;
      if (name !== undefined) { updates.push(`name = $${i++}`); values.push(name); }
      if (description !== undefined) { updates.push(`description = $${i++}`); values.push(description); }
      if (code !== undefined) { updates.push(`code = $${i++}`); values.push(code.toUpperCase()); }
      if (discount_type !== undefined) { updates.push(`discount_type = $${i++}`); values.push(discount_type); }
      if (discount_value !== undefined) { updates.push(`discount_value = $${i++}`); values.push(discount_value); }
      if (minimum_order !== undefined) { updates.push(`minimum_order = $${i++}`); values.push(minimum_order); }
      if (expiry_date !== undefined) { updates.push(`expiry_date = $${i++}`); values.push(expiry_date || null); }
      if (is_active !== undefined) { updates.push(`is_active = $${i++}`); values.push(is_active === true || is_active === "true"); }
      if (updates.length === 0) return res.status(400).json({ message: "Nothing to update" });
      values.push(req.params.id);
      const result = await query(`UPDATE coupons SET ${updates.join(", ")} WHERE id = $${i} RETURNING *`, values);
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/admin/coupons/:id", adminMiddleware, async (req, res) => {
    try {
      await query("DELETE FROM coupons WHERE id = $1", [req.params.id]);
      res.json({ message: "Coupon deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== ORDERS ====================

  app.post("/api/orders", async (req, res) => {
    try {
      const { user_id, guest_id, name, phone, address, items, coupon_code, notes } = req.body;
      if (!name || !phone || !address || !items || items.length === 0) {
        return res.status(400).json({ message: "Name, phone, address, and items are required" });
      }

      // Calculate totals
      let subtotal = 0;
      for (const item of items) {
        subtotal += item.price * item.quantity;
      }

      let discount = 0;
      if (coupon_code) {
        const couponRes = await query(
          "SELECT * FROM coupons WHERE code = $1 AND is_active = true AND (expiry_date IS NULL OR expiry_date > NOW())",
          [coupon_code.toUpperCase()]
        );
        if (couponRes.rows.length > 0) {
          const coupon = couponRes.rows[0];
          if (subtotal >= parseFloat(coupon.minimum_order)) {
            if (coupon.discount_type === "percentage") {
              discount = subtotal * (parseFloat(coupon.discount_value) / 100);
            } else {
              discount = parseFloat(coupon.discount_value);
            }
          }
        }
      }

      const tax = (subtotal - discount) * TAX_RATE;
      const total_amount = subtotal - discount + DELIVERY_CHARGE + tax;

      const orderResult = await query(
        `INSERT INTO orders (user_id, guest_id, name, phone, address, subtotal, delivery_charge, tax, discount, total_amount, payment_method, coupon_code, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'COD', $11, 'Pending', $12) RETURNING *`,
        [user_id || null, guest_id || null, name, phone, address, subtotal.toFixed(2), DELIVERY_CHARGE.toFixed(2), tax.toFixed(2), discount.toFixed(2), total_amount.toFixed(2), coupon_code || null, notes || null]
      );
      const order = orderResult.rows[0];

      // Insert order items
      for (const item of items) {
        await query(
          "INSERT INTO order_items (order_id, product_id, product_name, size, price, quantity) VALUES ($1, $2, $3, $4, $5, $6)",
          [order.id, item.product_id || null, item.name, item.size || null, item.price, item.quantity]
        );
      }

      res.json({ ...order, items });
    } catch (err: any) {
      console.error("Order error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/orders/user", authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const ordersResult = await query(
        "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
      );
      const orders = ordersResult.rows;
      for (const order of orders) {
        const itemsRes = await query("SELECT * FROM order_items WHERE order_id = $1", [order.id]);
        order.items = itemsRes.rows;
      }
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const result = await query("SELECT * FROM orders WHERE id = $1", [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ message: "Order not found" });
      const order = result.rows[0];
      const itemsRes = await query("SELECT * FROM order_items WHERE order_id = $1", [order.id]);
      order.items = itemsRes.rows;
      res.json(order);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== ADMIN ROUTES ====================

  app.get("/api/admin/dashboard", adminMiddleware, async (req, res) => {
    try {
      const [usersRes, ordersRes, revenueRes, pendingRes] = await Promise.all([
        query("SELECT COUNT(*) as count FROM users WHERE role = 'user'"),
        query("SELECT COUNT(*) as count FROM orders"),
        query("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'Delivered'"),
        query("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'"),
      ]);
      res.json({
        total_users: parseInt(usersRes.rows[0].count),
        total_orders: parseInt(ordersRes.rows[0].count),
        total_revenue: parseFloat(revenueRes.rows[0].total),
        pending_orders: parseInt(pendingRes.rows[0].count),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/users", adminMiddleware, async (req, res) => {
    try {
      const result = await query(
        "SELECT id, full_name, email, phone, address, profile_image, is_active, created_at FROM users WHERE role = 'user' ORDER BY created_at DESC"
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/admin/users/:id/toggle", adminMiddleware, async (req, res) => {
    try {
      const result = await query(
        "UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, is_active, full_name, email",
        [req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/orders", adminMiddleware, async (req, res) => {
    try {
      const ordersResult = await query("SELECT * FROM orders ORDER BY created_at DESC");
      const orders = ordersResult.rows;
      for (const order of orders) {
        const itemsRes = await query("SELECT * FROM order_items WHERE order_id = $1", [order.id]);
        order.items = itemsRes.rows;
      }
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/admin/orders/:id/status", adminMiddleware, async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ["Pending", "Confirmed", "Preparing", "Out for Delivery", "Delivered"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const result = await query(
        "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
        [status, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
