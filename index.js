require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const sequelize = require("./database");
const cookieParser = require("cookie-parser");
const models = require("./models");

const {
  User,
  Collection,
  CustomField,
  Item,
  Comment,
  Like,
  Tag,
  ItemTag,
  CustomFieldValue,
} = models;

const app = express();
app.use(cookieParser());

app.use(
  cors({
    origin: "https://collections-manage.netlify.app",
    credentials: true,
  })
);

app.use(express.json());

const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ message: "Access Denied" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });

    req.user = user;
    next();
  });
};

// Register endpoint
app.post("/register", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      first_name: firstName,
      last_name: lastName,
      email,
      password: hashedPassword,
      role: "user",
    });

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Unexpected server error", error: error.message });
  }
});

// Login endpoint
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.status === "Blocked") {
      return res
        .status(403)
        .json({ message: "Your account is blocked. Please contact support." });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const userData = {
      id: user.user_id,
      email: user.email,
      role: user.role,
      name: `${user.first_name} ${user.last_name || ""}`,
    };

    const token = jwt.sign(userData, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      // domain: "https://collections-manage.netlify.app/",
    });

    await user.update({ last_login: new Date() });

    return res
      .status(200)
      .json({ message: "Login successful", user: userData, token });
  } catch (error) {
    return res.status(500).json({
      message: "Error during login",
      error: error.message,
    });
  }
});

// Logout route
app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logout successful" });
});

app.get("/auth/status", (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
});

// Create a new collection
app.get("/collection", async (req, res) => {
  try {
    const collections = await Collection.findAll({
      include: {
        model: CustomField,
        as: "custom_fields",
      },
    });

    res.json(collections);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all collections
app.post("/collection", async (req, res) => {
  try {
    const { name, description, topic, image_url, user_id, custom_fields } =
      req.body;

    // Create the collection and get the full object
    const collection = await Collection.create({
      user_id,
      name,
      description,
      topic,
      image_url,
    });

    if (custom_fields && custom_fields.length > 0) {
      await CustomField.bulkCreate(
        custom_fields.map((field) => ({
          ...field,
          collection_id: collection.collection_id,
        }))
      );
    }

    res.status(201).json(collection);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all collections for a user
app.get("/user/:user_id/collections", async (req, res) => {
  try {
    const collections = await Collection.findAll({
      where: { user_id: req.params.user_id },
      include: {
        model: CustomField,
        as: "custom_fields",
      },
    });
    res.json(collections);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get a specific collection
app.get("/collection/:collection_id", async (req, res) => {
  try {
    const collection = await Collection.findByPk(req.params.collection_id, {
      include: {
        model: CustomField,
        as: "custom_fields",
      },
    });
    if (!collection) {
      return res.status(404).json({ error: "Collection not found" });
    }
    res.json(collection);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// collection custom fields
app.get("/collection/:collection_id/custom-fields", async (req, res) => {
  try {
    const customFields = await CustomField.findAll({
      where: {
        collection_id: req.params.collection_id,
      },
    });

    if (customFields.length === 0) {
      return res
        .status(404)
        .json({ error: "No custom fields found for the given collection" });
    }

    res.json(customFields);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update a collection
app.put("/collection/:collection_id", async (req, res) => {
  try {
    const { name, description, topic, image_url, custom_fields } = req.body;
    const collection = await Collection.findByPk(req.params.collection_id);
    if (!collection) {
      return res.status(404).json({ error: "Collection not found" });
    }
    await collection.update({ name, description, topic, image_url });

    if (custom_fields) {
      await CustomField.destroy({
        where: { collection_id: collection.collection_id },
      });
      await CustomField.bulkCreate(
        custom_fields.map((field) => ({
          ...field,
          collection_id: collection.collection_id,
        }))
      );
    }

    res.json(collection);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a collection
app.delete("/collection/:collection_id", async (req, res) => {
  try {
    const collection = await Collection.findByPk(req.params.collection_id);
    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }
    await collection.destroy();
    res.json({ message: "Collection deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/items", async (req, res) => {
  try {
    const items = await Item.findAll({
      include: [
        {
          model: CustomField,
          as: "custom_fields",
        },
        {
          model: Tag,
          through: { attributes: [] },
        },
      ],
    });

    res.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(400).json({ error: error.message });
  }
});

// Create a new item in a collection
app.post("/collections/:collection_id/items", async (req, res) => {
  const { name, tags, custom_field_values } = req.body;
  try {
    const item = await Item.create({
      name,
      collection_id: req.params.collection_id,
    });
    console.log("Item created:", item.toJSON());

    if (custom_field_values && Object.keys(custom_field_values).length > 0) {
      console.log(
        "Attempting to create custom field values:",
        custom_field_values
      );
      const createdCustomFieldValues = await CustomFieldValue.bulkCreate(
        Object.entries(custom_field_values).map(
          ([custom_field_id, field_value]) => ({
            item_id: item.item_id,
            custom_field_id,
            field_value,
          })
        )
      );
      console.log("Created custom field values:", createdCustomFieldValues);
    } else {
      console.log("No custom field values to create");
    }

    if (tags && tags.length > 0) {
      console.log("Attempting to create tags:", tags);
      const uniqueTags = [...new Set(tags)];
      const tagRecords = await Promise.all(
        uniqueTags.map((tagName) =>
          Tag.findOrCreate({
            where: { tag_name: tagName },
            defaults: { tag_name: tagName },
          })
        )
      );
      console.log("Tag records:", tagRecords);
      const tagAssociations = tagRecords.map(([tag]) => ({
        item_id: item.item_id,
        tag_id: tag.tag_id,
      }));
      const createdItemTags = await ItemTag.bulkCreate(tagAssociations);
      console.log("Created item tags:", createdItemTags);
    } else {
      console.log("No tags to create");
    }

    res.status(201).json(item);
  } catch (error) {
    console.error("Error details:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get all items in a collection
app.get("/collection/:collection_id/items", async (req, res) => {
  try {
    const items = await Item.findAll({
      where: { collection_id: req.params.collection_id },
      include: [
        {
          model: CustomField,
          as: "custom_fields",
        },
        {
          model: CustomFieldValue,
          as: "custom_field_values",
        },
        {
          model: Tag,
          through: { attributes: [] },
        },
      ],
    });
    res.json(items);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/items/:item_id", async (req, res) => {
  const { item_id } = req.params;

  try {
    // Start a transaction
    const result = await sequelize.transaction(async (t) => {
      // Find the item
      const item = await Item.findByPk(item_id, { transaction: t });

      if (!item) {
        throw new Error("Item not found");
      }

      // Delete associated custom field values
      await CustomFieldValue.destroy({
        where: { item_id: item_id },
        transaction: t,
      });

      // Delete the item itself
      await item.destroy({ transaction: t });

      return item;
    });

    res.status(200).json({
      message: "Item and associated custom field values deleted successfully",
      item: result,
    });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(400).json({ error: error.message });
  }
});

app.get("/items/:item_id", async (req, res) => {
  const { item_id } = req.params;

  try {
    const items = await Item.findByPk(item_id, {
      include: [
        {
          model: CustomField,
          as: "custom_fields",
        },
        {
          model: Tag,
          through: { attributes: [] },
        },
      ],
    });

    res.json(items);
  } catch (error) {
    console.error("Error fetching item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/items/:item_id", async (req, res) => {
  const { item_id } = req.params;
  const { name, custom_field_values, tags } = req.body;

  try {
    // 1. Update item name
    if (name) {
      await Item.update({ name }, { where: { item_id } });
      console.log(`Item name updated to ${name}`);
    }

    // 2. Update custom field values
    if (custom_field_values && Object.keys(custom_field_values).length > 0) {
      // Remove old custom field values
      await CustomFieldValue.destroy({ where: { item_id } });
      console.log(`Old custom field values for item_id ${item_id} deleted`);

      // Add new custom field values
      const customFieldData = Object.entries(custom_field_values).map(
        ([custom_field_id, field_value]) => ({
          item_id: item_id,
          custom_field_id: parseInt(custom_field_id),
          field_value,
        })
      );
      await CustomFieldValue.bulkCreate(customFieldData);
      console.log(`New custom field values created for item_id ${item_id}`);
    }

    // 3. Update tags
    if (tags && tags.length > 0) {
      // Find or create the tags
      const tagInstances = await Promise.all(
        tags.map((tagName) =>
          Tag.findOrCreate({
            where: { tag_name: tagName },
            defaults: { tag_name: tagName },
          })
        )
      );
      console.log(
        `Tags found or created: ${tagInstances
          .map(([tag]) => tag.tag_name)
          .join(", ")}`
      );

      // Remove old associations
      await ItemTag.destroy({ where: { item_id } });

      // Create new associations
      const itemTags = tagInstances.map(([tag]) => ({
        item_id: item_id,
        tag_id: tag.tag_id,
      }));
      await ItemTag.bulkCreate(itemTags);
      console.log(`Tags associated with item_id ${item_id}`);
    }

    // Fetch the updated item with its associations
    const updatedItem = await Item.findByPk(item_id, {
      include: [
        {
          model: CustomFieldValue,
          as: "custom_field_values",
        },
        {
          model: Tag,
          through: { attributes: [] },
        },
      ],
    });

    res.json(updatedItem);
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(400).json({ error: error.message });
  }
});

app.get("/collections/top", async (req, res) => {
  try {
    const topCollections = await Collection.findAll({
      attributes: [
        "collection_id",
        "name",
        [sequelize.fn("COUNT", sequelize.col("Items.item_id")), "item_count"],
      ],
      include: [
        {
          model: Item,
          attributes: [],
        },
      ],
      group: ["Collection.collection_id"],
      order: [[sequelize.literal("item_count"), "DESC"]],
      limit: 5,
      subQuery: false,
    });

    res.json(topCollections);
  } catch (error) {
    console.error("Error fetching top collections:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/recent/items", async (req, res) => {
  try {
    const items = await Item.findAll({
      include: [
        {
          model: CustomField,
          as: "custom_fields",
        },
        {
          model: Tag,
          through: { attributes: [] },
        },
      ],
      order: [["created_at", "DESC"]],
      limit: 10,
    });

    res.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(400).json({ error: error.message });
  }
});

app.get("/users/:role", async (req, res) => {
  try {
    const { role } = req.params;

    if (role !== "Admin") {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }

    const users = await User.findAll({});

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/users/:user_id/block", async (req, res) => {
  const { user_id } = req.params;

  try {
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (req.user.role !== "Admin") {
      return res
        .status(403)
        .json({ message: "Only admins can change user status" });
    }

    await user.update({ status: "Blocked" });

    return res.status(200).json({ message: "User blocked successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Error blocking user",
      error: error.message,
    });
  }
});

app.put("/users/:user_id/role", async (req, res) => {
  const { user_id } = req.params;
  const { role } = req.body; // expected role: 'Admin' or 'User'

  if (req.user.role !== "Admin") {
    return res
      .status(403)
      .json({ message: "Only admins can change user roles" });
  }

  try {
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.update({ role });

    return res.status(200).json({ message: `User role updated to ${role}` });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating user role",
      error: error.message,
    });
  }
});

app.delete("/users/:user_id", async (req, res) => {
  const { user_id } = req.params;

  if (req.user.role !== "Admin") {
    return res.status(403).json({ message: "Only admins can delete users" });
  }

  try {
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.destroy();

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting user",
      error: error.message,
    });
  }
});

app.put("/users/:user_id/remove-admin", async (req, res) => {
  const { user_id } = req.params;

  if (req.user.user_id !== parseInt(user_id)) {
    return res
      .status(403)
      .json({ message: "You can only remove your own admin privileges" });
  }

  try {
    const adminCount = await User.count({ where: { role: "Admin" } });

    if (adminCount <= 1) {
      return res.status(400).json({
        message:
          "You cannot remove your admin privileges because you are the only admin",
      });
    }

    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.update({ role: "User" });

    return res
      .status(200)
      .json({ message: "Admin privileges removed successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Error removing admin privileges",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 3306;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
