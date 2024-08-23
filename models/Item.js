const { DataTypes } = require("sequelize");
const sequelize = require("../database");

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

module.exports = Item;
