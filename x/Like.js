const { DataTypes } = require("sequelize");
const sequelize = require("../database");
const Item = require("./Item");
const User = require("./User");

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

Like.belongsTo(Item, { foreignKey: "item_id", as: "item" });
Like.belongsTo(User, { foreignKey: "user_id", as: "user" });

module.exports = Like;
