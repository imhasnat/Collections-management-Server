const { DataTypes } = require("sequelize");
const sequelize = require("../database");
const CustomField = require("./CustomField");
const Item = require("./Item");

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

CustomFieldValue.belongsTo(Item, { foreignKey: "item_id", as: "item" });
CustomFieldValue.belongsTo(CustomField, {
  foreignKey: "custom_field_id",
  as: "custom_field",
});

module.exports = CustomFieldValue;
