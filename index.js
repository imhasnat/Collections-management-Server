require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const sequelize = require("./database");
const { Op } = require("sequelize");
const cookieParser = require("cookie-parser");
const models = require("./models");
const axios = require("axios");
const session = require("express-session");

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

app.use(cors());

app.use(
  session({
    secret: process.env.JWT_SECRET || "mySecreteKey",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      sameSite: "none",
    },
  })
);

app.use(express.json());

const authenticateToken = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Extract token from "Bearer <token>"

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

    // Send token in the response body instead of setting a cookie
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
  const token = req.headers.authorization?.split(" ")[1];
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

// Create a new collection
app.post("/collection", async (req, res) => {
  try {
    const { name, description, topic, image_url, user_id, custom_fields } =
      req.body;

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

// ***************************************
// **************** Item *****************
// ***************************************
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

    if (custom_field_values && Object.keys(custom_field_values).length > 0) {
      const createdCustomFieldValues = await CustomFieldValue.bulkCreate(
        Object.entries(custom_field_values).map(
          ([custom_field_id, field_value]) => ({
            item_id: item.item_id,
            custom_field_id,
            field_value,
          })
        )
      );
    }
    if (tags && tags.length > 0) {
      const uniqueTags = [...new Set(tags)];
      const tagRecords = await Promise.all(
        uniqueTags.map((tagName) =>
          Tag.findOrCreate({
            where: { tag_name: tagName },
            defaults: { tag_name: tagName },
          })
        )
      );
      const tagAssociations = tagRecords.map(([tag]) => ({
        item_id: item.item_id,
        tag_id: tag.tag_id,
      }));
      const createdItemTags = await ItemTag.bulkCreate(tagAssociations);
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
    const result = await sequelize.transaction(async (t) => {
      const item = await Item.findByPk(item_id, { transaction: t });

      if (!item) {
        throw new Error("Item not found");
      }

      await CustomFieldValue.destroy({
        where: { item_id: item_id },
        transaction: t,
      });

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
    if (name) {
      await Item.update({ name }, { where: { item_id } });
    }

    if (custom_field_values && Object.keys(custom_field_values).length > 0) {
      await CustomFieldValue.destroy({ where: { item_id } });

      const customFieldData = Object.entries(custom_field_values).map(
        ([custom_field_id, field_value]) => ({
          item_id: item_id,
          custom_field_id: parseInt(custom_field_id),
          field_value,
        })
      );
      await CustomFieldValue.bulkCreate(customFieldData);
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

      // Remove old associations
      await ItemTag.destroy({ where: { item_id } });

      // Create new associations
      const itemTags = tagInstances.map(([tag]) => ({
        item_id: item_id,
        tag_id: tag.tag_id,
      }));
      await ItemTag.bulkCreate(itemTags);
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

app.get("/tags", async (req, res) => {
  try {
    const allTags = await Tag.findAll();
    res.status(200).json({ message: "Tag fetch successfully", data: allTags });
  } catch (error) {
    console.error("Tag fetch failed", error);
    res.status(500).json({ message: error.message });
  }
});

// ***************************************
// ************** User *******************
// ***************************************
// get all user
app.get("/users", authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;
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

// change status
app.put("/users/:user_id/status", authenticateToken, async (req, res) => {
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

    const newStatus = user.status === "Active" ? "Blocked" : "Active";
    await user.update({ status: newStatus });

    return res.status(200).json({
      message: `User status updated to ${newStatus} successfully`,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating user status",
      error: error.message,
    });
  }
});

// delete a user
app.delete("/users/:user_id", authenticateToken, async (req, res) => {
  const { user_id } = req.params;
  const currentUserId = req.user.id;

  try {
    const user = await User.findByPk(user_id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user_id == currentUserId) {
      if (user.role !== "Admin") {
        return res
          .status(403)
          .json({ message: "Only admins can delete their own account" });
      }

      // Check if there are other admins before allowing deletion
      const otherAdmins = await User.findAll({
        where: {
          role: "Admin",
          user_id: { [Op.ne]: currentUserId },
        },
      });

      if (otherAdmins.length === 0) {
        return res.status(400).json({
          message:
            "You are the only admin. Assign another admin before deleting your account.",
        });
      }

      await user.destroy();
      res.clearCookie("authToken");
      return res
        .status(200)
        .json({ role: "admin", message: "Account deleted successfully" });
    } else {
      if (req.user.role !== "Admin") {
        return res
          .status(403)
          .json({ message: "Only admins can delete users" });
      }

      if (user.role === "Admin") {
        return res
          .status(403)
          .json({ message: "Admins cannot delete other admin accounts" });
      }

      await user.destroy();
      return res.status(200).json({ message: "User deleted successfully" });
    }
  } catch (error) {
    console.error("Error deleting user/account:", error);
    res.status(500).json({ message: error.message });
  }
});

// change role
app.put("/users/:user_id/role", authenticateToken, async (req, res) => {
  const { user_id } = req.params;

  if (req.user.user_id === parseInt(user_id)) {
    return res
      .status(403)
      .json({ message: "Admins cannot change their own role." });
  }

  if (req.user.role !== "Admin") {
    return res
      .status(403)
      .json({ message: "Only admins can change user roles." });
  }

  try {
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const newRole = user.role === "Admin" ? "User" : "Admin";
    await user.update({ role: newRole });

    return res.status(200).json({ message: `User role updated to ${newRole}` });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error updating user role.", error: error.message });
  }
});

// *********************************
// *********** JIRA ****************
// *********************************
const jiraDomain = process.env.JIRA_DOMAIN;
const jiraEmail = process.env.JIRA_EMAIL;
const jiraApiToken = process.env.JIRA_API_TOKEN;
const jiraProjectKey = process.env.JIRA_PROJECT_KEY;

const authHeader = `Basic ${Buffer.from(
  `${jiraEmail}:${jiraApiToken}`
).toString("base64")}`;

async function getUserByEmail(email) {
  try {
    const response = await axios.get(
      `https://${jiraDomain}/rest/api/3/user/search?query=${email}`,
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.length > 0 ? response.data[0].accountId : null;
  } catch (error) {
    console.error("Error checking if user exists:", error.message);
    return null;
  }
}

async function inviteUserToJira(email) {
  try {
    // Invite the user with the correct product access
    const response = await axios.post(
      `https://${jiraDomain}/rest/api/3/user`,
      {
        emailAddress: email,
        displayName: email.split("@")[0],
        products: ["jira-software"], // Ensure this is the correct application key
      },
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(response.data);

    return {
      message:
        "You are invited. Please ask the user to accept the invite and try again.",
    };
  } catch (error) {
    console.error(
      "Error inviting user to Jira:",
      error.response ? error.response.data : error.message
    );
    return {
      message: `Error inviting user to Jira:  ${error.message}`,
    };
  }
}

async function handleJiraIssueCreation(
  summary,
  priority,
  email,
  collection = "",
  link
) {
  try {
    // Check if the user exists in the project
    const user = await getUserByEmail(email);

    if (!user) {
      console.log("User does not exist, inviting and adding to project...");
      const inviteResponse = await inviteUserToJira(email);
      return {
        message: inviteResponse.message,
      };
    } else {
      console.log("User already exists in Jira.");
      // Create the issue since the user exists
      console.log("Creating issue for user:", user);

      // Get the custom field IDs
      const collectionFieldId = await getCustomFieldId("Collection");
      const linkFieldId = await getCustomFieldId("Link");

      const customFields = {
        [collectionFieldId]: collection,
        [linkFieldId]: link,
      };

      const issue = await createJiraIssue(
        summary,
        priority,
        user,
        customFields
      );
      return {
        message: "Issue created successfully",
        issueKey: issue.key,
        issueUrl: `https://${jiraDomain}/browse/${issue.key}`,
      };
    }
  } catch (error) {
    console.error("Error in handleJiraIssueCreation:", error.message);
    throw error;
  }
}

async function getAvailablePriorityValues() {
  try {
    const response = await axios.get(
      `https://${jiraDomain}/rest/api/3/priority`,
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error retrieving priority values:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function getPriorityName(priorityValue) {
  const priorityValues = await getAvailablePriorityValues();
  const priority = priorityValues.find(
    (p) => p.name.toLowerCase() === priorityValue.toLowerCase()
  );
  if (!priority) {
    throw new Error(`Invalid priority value: ${priorityValue}`);
  }
  return priority.name;
}

async function createJiraIssue(
  summary,
  priority,
  assigneeAccountId,
  customFields = {}
) {
  try {
    const priorityName = await getPriorityName(priority);

    const issueFields = {
      project: {
        key: jiraProjectKey,
      },
      summary: summary,
      issuetype: {
        name: "Task",
      },
      assignee: {
        accountId: assigneeAccountId,
      },
      priority: {
        name: priorityName,
      },
      reporter: {
        accountId: assigneeAccountId,
      },
    };

    // Add custom fields to the issueFields object
    Object.entries(customFields).forEach(([fieldId, value]) => {
      issueFields[`customfield_${fieldId}`] = value;
    });

    const response = await axios.post(
      `https://${jiraDomain}/rest/api/3/issue`,
      { fields: issueFields },
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );
    return { message: "Issue created successfully" };
  } catch (error) {
    console.error(
      "Error creating Jira issue:",
      error.response?.data || error.message
    );
    return { message: "Issue created successfully" };
  }
}

async function getCustomFieldId(fieldName) {
  try {
    const response = await axios.get(`https://${jiraDomain}/rest/api/3/field`, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const field = response.data.find(
      (f) => f.name.toLowerCase() === fieldName.toLowerCase()
    );
    if (!field) {
      throw new Error(`Custom field '${fieldName}' not found.`);
    }
    return field.id.replace("customfield_", "");
  } catch (error) {
    console.error("Error getting custom field ID:", error.message);
    throw error;
  }
}

app.post("/create-jira-issue", async (req, res) => {
  const { summary, priority, email, collection, link } = req.body;
  console.log();

  try {
    const result = await handleJiraIssueCreation(
      summary,
      priority,
      email,
      collection,
      link
    );
    res.json({ message: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/user/tickets", async (req, res) => {
  const { email } = req.query;
  const accountId = await getUserByEmail(email);
  console.log(email);
  try {
    const response = await axios.get(
      `https://${jiraDomain}/rest/api/3/search?jql=reporter=${accountId}`,
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );
    res.send({ result: response.data.issues, domain: jiraDomain });
  } catch (error) {
    console.error("Error fetching issues for user:", error.message);
    throw error;
  }
});

const PORT = process.env.PORT || 3306;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
