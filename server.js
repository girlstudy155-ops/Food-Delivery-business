import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// -------------------- MIDDLEWARE --------------------

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// -------------------- CREATE UPLOAD FOLDER --------------------

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// -------------------- FILE DATABASE --------------------

const productsFile = path.join(__dirname, "products.json");
const categoriesFile = path.join(__dirname, "categories.json");
const couponsFile = path.join(__dirname, "coupons.json");
const ordersFile = path.join(__dirname, "orders.json");

// LOAD DATA
function loadData(file) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify([], null, 2));
    }

    const data = fs.readFileSync(file, "utf8");

    if (!data) return [];

    return JSON.parse(data);
  } catch {
    return [];
  }
}

// SAVE DATA
function saveData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// LOAD DATABASE
let products = loadData(productsFile);
let categories = loadData(categoriesFile);
let coupons = loadData(couponsFile);
let orders = loadData(ordersFile);

// -------------------- MULTER --------------------

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];

    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG PNG allowed"));
  },
});

// -------------------- AUTH --------------------

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (email === "admin@gmail.com" && password === "123") {
    return res.json({
      token: "admin-token",
      user: {
        full_name: "Admin User",
        email,
        role: "admin",
      },
    });
  }

  res.status(401).json({ message: "Invalid credentials" });
});

// -------------------- CATEGORY --------------------

app.get("/api/admin/categories", (_req, res) => {
  res.json(categories);
});

app.post("/api/admin/categories", (req, res) => {
  const { name, is_active } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Name required" });
  }

  const id =
    categories.length > 0
      ? categories[categories.length - 1].id + 1
      : 1;

  const newCategory = {
    id,
    name: name.trim(),
    is_active: is_active !== undefined ? Boolean(is_active) : true,
  };

  categories.push(newCategory);

  saveData(categoriesFile, categories);

  res.json(newCategory);
});

app.get("/api/categories", (_req, res) => {
  const active = categories.filter((c) => c.is_active !== false);
  res.json(active);
});
// -------------------- CATEGORY --------------------

app.get("/api/admin/categories", (_req, res) => {
  res.json(categories);
});

app.post("/api/admin/categories", (req, res) => {
  const { name, is_active } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Name required" });
  }

  const id =
    categories.length > 0
      ? categories[categories.length - 1].id + 1
      : 1;

  const newCategory = {
    id,
    name: name.trim(),
    is_active: is_active !== undefined ? Boolean(is_active) : true,
  };

  categories.push(newCategory);

  saveData(categoriesFile, categories);

  res.json(newCategory);
});

app.put("/api/admin/categories/:id", (req, res) => {

  const id = Number(req.params.id);
  const { name } = req.body;

  const category = categories.find((c) => c.id === id);

  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  category.name = name.trim();

  saveData(categoriesFile, categories);

  res.json(category);

});

app.delete("/api/admin/categories/:id", (req, res) => {

  const id = Number(req.params.id);

  const index = categories.findIndex((c) => c.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "Category not found" });
  }

  categories.splice(index, 1);

  saveData(categoriesFile, categories);

  res.json({ message: "Category deleted" });

});

app.get("/api/categories", (_req, res) => {
  const active = categories.filter((c) => c.is_active !== false);
  res.json(active);
});

// -------------------- PRODUCTS --------------------

app.get("/api/admin/products", (_req, res) => {
  res.json(products);
});

app.get("/api/products", (req, res) => {
  const { highlighted, category_id } = req.query;

  let result = [...products];

  result = result.filter((p) => p.is_active !== false);

  if (category_id) {
    result = result.filter(
      (p) => p.category_id === Number(category_id)
    );
  }

  if (highlighted === "true") {
    result = result.filter((p) => p.is_highlighted === true);
  }

  result = result.map((p) => {
    const category = categories.find(
      (c) => c.id === p.category_id
    );

    return {
      ...p,
      category_name: category ? category.name : "Uncategorized",
    };
  });

  res.json(result);
});

app.get("/api/products/:id", (req, res) => {
  const id = Number(req.params.id);

  const product = products.find(
    (p) => p.id === id && p.is_active !== false
  );

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const category = categories.find(
    (c) => c.id === product.category_id
  );

  res.json({
    ...product,
    category_name: category ? category.name : "Uncategorized",
  });
});

app.post("/api/admin/products", upload.single("image"), (req, res) => {
  const {
    name,
    description,
    category_id,
    price_small,
    price_medium,
    price_large,
    is_highlighted,
  } = req.body;

  if (!name || !category_id) {
    return res
      .status(400)
      .json({ message: "Name and category required" });
  }

  const category = categories.find(
    (c) => c.id === Number(category_id)
  );

  const id =
    products.length > 0
      ? products[products.length - 1].id + 1
      : 1;

  const newProduct = {
    id,
    name: name.trim(),
    description: description?.trim() || "",
    category_id: Number(category_id),
    category_name: category ? category.name : "Uncategorized",
    price_small: Number(price_small) || 0,
    price_medium: Number(price_medium) || 0,
    price_large: Number(price_large) || 0,
    is_active: true,
    is_highlighted:
      is_highlighted === "true" || is_highlighted === true,
    image: req.file ? `/uploads/${req.file.filename}` : null,
  };

  products.push(newProduct);

  saveData(productsFile, products);

  res.json(newProduct);
});

app.delete("/api/admin/products/:id", (req, res) => {
  const id = Number(req.params.id);

  products = products.filter((p) => p.id !== id);

  saveData(productsFile, products);

  res.json({ message: "Product deleted" });
});
app.put("/api/admin/products/:id", upload.single("image"), (req, res) => {
  const id = Number(req.params.id);
  const productIndex = products.findIndex((p) => p.id === id);

  if (productIndex === -1) {
    return res.status(404).json({ message: "Product not found" });
  }

  const {
    name,
    description,
    category_id,
    price_small,
    price_medium,
    price_large,
    is_highlighted,
  } = req.body;

  const existing = products[productIndex];

  const category = categories.find((c) => c.id === Number(category_id));

  products[productIndex] = {
    ...existing,
    name: name?.trim() || existing.name,
    description: description?.trim() || existing.description,
    category_id: category_id ? Number(category_id) : existing.category_id,
    category_name: category ? category.name : existing.category_name,
    price_small: price_small !== undefined ? Number(price_small) : existing.price_small,
    price_medium: price_medium !== undefined ? Number(price_medium) : existing.price_medium,
    price_large: price_large !== undefined ? Number(price_large) : existing.price_large,
    is_highlighted:
      is_highlighted === "true" || is_highlighted === true
        ? true
        : false,
    image: req.file ? `/uploads/${req.file.filename}` : existing.image,
  };

  saveData(productsFile, products);

  res.json(products[productIndex]);
});

// -------------------- COUPONS --------------------

app.get("/api/admin/coupons", (_req, res) => {
  res.json(coupons);
});
app.post("/api/admin/coupons", (req, res) => {
  const { name, description, code, discount_type, discount_value, minimum_order, expiry_date, is_active } = req.body;

  if (!code || !discount_value) {
    return res.status(400).json({ message: "Code and discount value required" });
  }

  const exist = coupons.find(c => c.code === code.toUpperCase());
  if (exist) return res.status(400).json({ message: "Coupon already exists" });

  const id = coupons.length > 0 ? coupons[coupons.length - 1].id + 1 : 1;

  const newCoupon = {
    id,
    name: name || code,
    description: description || "",
    code: code.toUpperCase(),
    discount_type: discount_type || "percentage",
    discount_value: Number(discount_value),
    minimum_order: minimum_order || 0,
    expiry_date: expiry_date || null,
    is_active: is_active !== undefined ? Boolean(is_active) : true,
  };

  coupons.push(newCoupon);
  saveData(couponsFile, coupons);

  res.json(newCoupon);
});
// -------------------- DELETE COUPON --------------------
app.delete("/api/admin/coupons/:id", (req, res) => {
  const id = Number(req.params.id);

  const index = coupons.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ message: "Coupon not found" });
  }

  // Remove the coupon from array
  const deletedCoupon = coupons.splice(index, 1)[0];

  // Save updated data
  saveData(couponsFile, coupons);

  res.json({
    success: true,
    message: `Coupon '${deletedCoupon.code}' deleted`,
    deletedCoupon,
  });
});

// ---------------- VALIDATE COUPON ----------------
app.post("/api/coupons/validate", (req, res) => {
  const { code, subtotal } = req.body;

  if (!code) return res.status(400).json({ message: "Coupon code required" });

  const coupon = coupons.find(c => c.code === code.toUpperCase() && c.is_active);

  if (!coupon) return res.status(400).json({ message: "Invalid coupon" });

  // Optional: check minimum order
  if (subtotal < (coupon.minimum_order || 0)) {
    return res.status(400).json({ message: `Minimum order ₹${coupon.minimum_order}` });
  }

  // Optional: check expiry date
  if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
    return res.status(400).json({ message: "Coupon expired" });
  }

  res.json(coupon);
});
// -------------------- CREATE ORDER --------------------

app.post("/api/orders", (req, res) => {
 const {
  items,
  total_amount,
  address,
  name,
  phone,
  notes,
  coupon_code,
  user_id,
  guest_id
} = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ message: "Order items required" });
  }

  // ---------- SUBTOTAL CALCULATION ----------

  let subtotal = 0;

  items.forEach((item) => {
    subtotal += Number(item.price) * Number(item.quantity);
  });

  // ---------- COUPON APPLY ----------

  let discount = 0;

  if (coupon_code) {
    const coupon = coupons.find(
      (c) =>
        c.code === coupon_code.toUpperCase() &&
        c.is_active !== false
    );

    if (coupon) {
      if (coupon.discount_type === "percentage") {
        discount = (subtotal * coupon.discount_value) / 100;
      } else {
        discount = coupon.discount_value;
      }
    }
  }

  // ---------- TAX & DELIVERY ----------

  const TAX_RATE = 0.05;
  const DELIVERY = 2.99;

  const tax = (subtotal - discount) * TAX_RATE;

  const finalTotal =
    subtotal - discount + tax + DELIVERY;

  // ---------- ORDER ID ----------

  const id =
    orders.length > 0
      ? orders[orders.length - 1].id + 1
      : 1;

  const newOrder = {
  id,
  created_at: new Date().toISOString(),
  status: "pending",

  user_id: user_id || null,
  guest_id: guest_id || null,

  customer: {
    name: name || "",
    phone: phone || "",
    address: address || "",
    notes: notes || "",
  },

    coupon_code: coupon_code || null,

    subtotal,
    discount,
    tax,
    delivery: DELIVERY,

    total_amount: Number(total_amount) || finalTotal,

    items: items.map((i) => ({
      product_id: i.product_id,
      product_name: i.name || i.product_name,
      size: i.size,
      quantity: i.quantity,
      price: i.price,
    })),
  };

  orders.push(newOrder);

  saveData(ordersFile, orders);

  res.json({
    success: true,
    id: newOrder.id,
    total: newOrder.total_amount,
  });
});

// -------------------- GET USER ORDERS --------------------

app.get("/api/orders/user", (req, res) => {

  const { user_id, guest_id } = req.query;

  let userOrders = [];

  if (user_id) {
    userOrders = orders.filter(o => o.user_id == Number(user_id));
  } 
  else if (guest_id) {
    userOrders = orders.filter(o => o.guest_id == guest_id);
  }

  res.json(userOrders);

});
// -------------------- ERROR HANDLER --------------------

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({
    message: err.message || "Server error",
  });
});
// -------------------- ADMIN GET ORDERS --------------------

app.get("/api/admin/orders", (req, res) => {

  const formattedOrders = orders.map((o) => ({

    id: o.id,
    created_at: o.created_at || new Date().toISOString(),

    status: o.status || "Pending",

    name: o.customer?.name || "",
    phone: o.customer?.phone || "",
    address: o.customer?.address || "",
    
    // Include user_id and guest_id
    user_id: o.user_id || null,
    guest_id: o.guest_id || null,


    // PRODUCTS
    items: (o.items || []).map((i) => ({
      product_id: i.product_id,
      name: i.product_name,
      size: i.size,
      quantity: i.quantity,
      price: i.price
    })),

    // COUPON
    coupon_code: o.coupon_code || null,

    // PRICE DETAILS
    subtotal: o.subtotal || 0,
    discount: o.discount || 0,
    tax: o.tax || 0,
    delivery: o.delivery || 0,

    total_amount: Number(o.total_amount) || 0

  }));

  res.json(formattedOrders);

});
// -------------------- UPDATE ORDER STATUS --------------------

app.put("/api/admin/orders/:id/status", (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;

  const order = orders.find((o) => o.id === id);

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  order.status = status;

  saveData(ordersFile, orders);

  res.json({
    success: true,
    message: "Order status updated",
    order,
  });
});

// -------------------- USERS --------------------

const usersFile = path.join(__dirname, "users.json");

let users = loadData(usersFile);
// ---------------- REGISTER USER ----------------
app.post("/api/register", (req, res) => {
  const { full_name, email, password, address, phone, profile_image } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({
      message: "Full name, email and password required",
    });
  }

  const exist = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (exist) {
    return res.status(400).json({
      message: "Email already registered",
    });
  }

  const id =
    users.length > 0
      ? users[users.length - 1].id + 1
      : 1;

  const newUser = {
    id,
    full_name,
    email: email.toLowerCase(),
    password,
    address: address || "",
    phone: phone || "",
    profile_image: profile_image || "", // <-- added field
    created_at: new Date().toISOString(),
  };

  users.push(newUser);

  saveData(usersFile, users);

  res.json({
    success: true,
    message: "User registered successfully",
    user: {
      id: newUser.id,
      full_name: newUser.full_name,
      email: newUser.email,
      profile_image: newUser.profile_image, // <-- return profile image
    },
  });
});

// ---------------- LOGIN USER ----------------
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    (u) =>
      u.email.toLowerCase() === email.toLowerCase() &&
      u.password === password
  );

  if (!user) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  res.json({
    success: true,
    message: "Login successful",
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      profile_image: user.profile_image || "", // <-- include profile image
    },
  });
});

// ---------------- GET USERS ----------------
app.get("/api/users", (req, res) => {
  const safeUsers = users.map((u) => ({
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    address: u.address,
    phone: u.phone,
    profile_image: u.profile_image || "", // <-- include profile image
    created_at: u.created_at,
  }));

  res.json(safeUsers);
});

// ---------------- DELETE USER ----------------
app.delete("/api/users/:id", (req, res) => {
  const id = Number(req.params.id);

  const index = users.findIndex((u) => u.id === id);
  if (index === -1) {
    return res.status(404).json({ message: "User not found" });
  }

  const deletedUser = users.splice(index, 1)[0];
  saveData(usersFile, users);

  res.json({
    success: true,
    message: `User '${deletedUser.full_name}' deleted successfully`,
    deletedUser,
  });
});
// ---------------- TOGGLE USER STATUS ----------------
app.patch("/api/users/:id/status", (req, res) => {
  const id = Number(req.params.id);
  const { isActive } = req.body;

  const user = users.find((u) => u.id === id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.isActive = !!isActive; // convert to boolean
  saveData(usersFile, users);

  res.json({
    success: true,
    message: `User '${user.full_name}' is now ${user.isActive ? "Active" : "Inactive"}`,
    user,
  });
});
// -------------------- START SERVER --------------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
