const { DataTypes } = require("sequelize");
const sequelize = require("../database");
const Collection = require("./Collection");
const CustomFieldValue = require("./CustomFieldValue");
const Comment = require("./Comment");
const Like = require("./Like");
const Tag = require("./Tag");

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
    tags: {
      type: DataTypes.JSON,
    },
  },
  {
    tableName: "items", // Use snake_case for table names
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

Item.belongsTo(Collection, {
  foreignKey: "collection_id",
  as: "collection",
});
Item.hasMany(CustomFieldValue, {
  foreignKey: "item_id",
  as: "custom_field_values",
});
Item.hasMany(Comment, { foreignKey: "item_id", as: "comments" });
Item.hasMany(Like, { foreignKey: "item_id", as: "likes" });
Item.belongsToMany(Tag, {
  through: "item_tags",
  foreignKey: "item_id",
  as: "tags",
});

module.exports = Item;
