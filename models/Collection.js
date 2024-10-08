const { DataTypes } = require("sequelize");
const sequelize = require("../database");

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
    tableName: "collections",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Collection;
