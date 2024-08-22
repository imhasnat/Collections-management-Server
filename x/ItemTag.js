const { DataTypes } = require("sequelize");
const sequelize = require("../database");
const Item = require("./Item");
const Tag = require("./Tag");

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

ItemTag.belongsTo(Item, { foreignKey: "item_id", as: "item" });
ItemTag.belongsTo(Tag, { foreignKey: "tag_id", as: "tag" });

module.exports = ItemTag;
