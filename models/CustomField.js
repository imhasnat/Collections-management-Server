const { DataTypes } = require("sequelize");
const sequelize = require("../database");

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

module.exports = CustomField;
