const { DataTypes } = require("sequelize");
const sequelize = require("../database");

const User = sequelize.define(
  "User",
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("User", "Admin"),
      defaultValue: "User",
    },
    status: {
      type: DataTypes.ENUM("Active", "Blocked"),
      defaultValue: "Active",
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

const Collection = sequelize.define(
  "Collection",
  {
    collection_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    topic: {
      type: DataTypes.STRING,
    },
    image_url: {
      type: DataTypes.STRING,
    },
  },
  {
    tableName: "collections", // snake_case for table name
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

const CustomField = sequelize.define(
  "CustomField",
  {
    custom_field_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    collection_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    field_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    field_type: {
      type: DataTypes.ENUM(
        "Integer",
        "String",
        "Multiline Text",
        "Boolean",
        "Date"
      ),
      allowNull: false,
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "custom_fields",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false, // Only createdAt is tracked, no updatedAt
  }
);

const Item = sequelize.define(
  "Item",
  {
    item_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    collection_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // tags: {
    //   type: DataTypes.JSON,
    // },
  },
  {
    tableName: "items", // Use snake_case for table names
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

const CustomFieldValue = sequelize.define(
  "CustomFieldValue",
  {
    custom_field_value_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    custom_field_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    field_value: {
      type: DataTypes.TEXT,
    },
  },
  {
    tableName: "custom_field_values",
    timestamps: false,
  }
);

const Comment = sequelize.define(
  "Comment",
  {
    comment_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    comment_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "comments",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

const ItemTag = sequelize.define(
  "ItemTag",
  {
    item_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    tag_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
  },
  {
    tableName: "item_tags",
    timestamps: false,
  }
);

const Like = sequelize.define(
  "Like",
  {
    like_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "likes",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

const Tag = sequelize.define(
  "Tag",
  {
    tag_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tag_name: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
    },
  },
  {
    tableName: "tags",
    timestamps: false,
  }
);

// Collection Associations
Collection.belongsTo(User, { foreignKey: "user_id", as: "user" });
Collection.hasMany(CustomField, {
  foreignKey: "collection_id",
  as: "custom_fields",
});
Collection.hasMany(Item, {
  foreignKey: "collection_id",
});

// CustomField Associations
CustomField.belongsTo(Collection, {
  foreignKey: "collection_id",
  as: "collection",
});
CustomField.hasMany(CustomFieldValue, {
  foreignKey: "custom_field_id",
  as: "custom_field_values",
});

// Item Associations
Item.belongsTo(Collection, {
  foreignKey: "collection_id",
  as: "collection",
});
Item.belongsToMany(CustomField, {
  through: CustomFieldValue,
  foreignKey: "item_id",
  otherKey: "custom_field_id",
  as: "custom_fields",
});
Item.hasMany(CustomFieldValue, {
  foreignKey: "item_id",
  as: "custom_field_values",
});
Item.hasMany(Comment, { foreignKey: "item_id", as: "comments" });
Item.hasMany(Like, { foreignKey: "item_id", as: "likes" });
Item.belongsToMany(Tag, { through: ItemTag, foreignKey: "item_id" });
Tag.belongsToMany(Item, { through: ItemTag, foreignKey: "tag_id" });

// CustomFieldValue Associations
CustomFieldValue.belongsTo(Item, { foreignKey: "item_id", as: "item" });
CustomFieldValue.belongsTo(CustomField, {
  foreignKey: "custom_field_id",
  as: "custom_field",
});

// ItemTag Associations
ItemTag.belongsTo(Item, { foreignKey: "item_id", as: "item" });
ItemTag.belongsTo(Tag, { foreignKey: "tag_id", as: "tag" });

// Comment Associations
Comment.belongsTo(Item, { foreignKey: "item_id", as: "item" });
Comment.belongsTo(User, { foreignKey: "user_id", as: "user" });

// Like Associations
Like.belongsTo(Item, { foreignKey: "item_id", as: "item" });
Like.belongsTo(User, { foreignKey: "user_id", as: "user" });

module.exports = {
  User,
  Collection,
  CustomField,
  Item,
  Comment,
  CustomFieldValue,
  Like,
  Tag,
  ItemTag,
};
