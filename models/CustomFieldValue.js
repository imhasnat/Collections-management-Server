const { DataTypes } = require("sequelize");
const sequelize = require("../database");

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

module.exports = CustomFieldValue;
