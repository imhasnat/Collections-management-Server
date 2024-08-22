const { DataTypes } = require("sequelize");
const sequelize = require("../database");

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

module.exports = Tag;
