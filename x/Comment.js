const { DataTypes } = require("sequelize");
const sequelize = require("../database");

const Item = require("./Item");
const User = require("./User");

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

Comment.belongsTo(Item, { foreignKey: "item_id", as: "item" });
Comment.belongsTo(User, { foreignKey: "user_id", as: "user" });

module.exports = Comment;
