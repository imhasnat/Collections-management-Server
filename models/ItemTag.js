const { DataTypes } = require("sequelize");
const sequelize = require("../database");

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

module.exports = ItemTag;
