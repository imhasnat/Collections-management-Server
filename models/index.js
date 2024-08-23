const User = require("./User");
const Collection = require("./Collection");
const CustomField = require("./CustomField");
const CustomFieldValue = require("./CustomFieldValue");
const Item = require("./Item");
const Comment = require("./Comment");
const Like = require("./Like");
const Tag = require("./Tag");
const ItemTag = require("./ItemTag");

// Associations
Collection.belongsTo(User, { foreignKey: "user_id", as: "user" });
Collection.hasMany(CustomField, {
  foreignKey: "collection_id",
  as: "custom_fields",
});
Collection.hasMany(Item, {
  foreignKey: "collection_id",
});

// CustomField Associations
CustomField.belongsTo(Collection, {
  foreignKey: "collection_id",
  as: "collection",
});
CustomField.hasMany(CustomFieldValue, {
  foreignKey: "custom_field_id",
  as: "custom_field_values",
});

// Item Associations
Item.belongsTo(Collection, {
  foreignKey: "collection_id",
  as: "collection",
});
Item.belongsToMany(CustomField, {
  through: CustomFieldValue,
  foreignKey: "item_id",
  otherKey: "custom_field_id",
  as: "custom_fields",
});
Item.hasMany(CustomFieldValue, {
  foreignKey: "item_id",
  as: "custom_field_values",
});
Item.hasMany(Comment, { foreignKey: "item_id", as: "comments" });
Item.hasMany(Like, { foreignKey: "item_id", as: "likes" });
Item.belongsToMany(Tag, { through: ItemTag, foreignKey: "item_id" });
Tag.belongsToMany(Item, { through: ItemTag, foreignKey: "tag_id" });

// CustomFieldValue Associations
CustomFieldValue.belongsTo(Item, { foreignKey: "item_id", as: "item" });
CustomFieldValue.belongsTo(CustomField, {
  foreignKey: "custom_field_id",
  as: "custom_field",
});

// ItemTag Associations
ItemTag.belongsTo(Item, { foreignKey: "item_id", as: "item" });
ItemTag.belongsTo(Tag, { foreignKey: "tag_id", as: "tag" });

// Comment Associations
Comment.belongsTo(Item, { foreignKey: "item_id", as: "item" });
Comment.belongsTo(User, { foreignKey: "user_id", as: "user" });

// Like Associations
Like.belongsTo(Item, { foreignKey: "item_id", as: "item" });
Like.belongsTo(User, { foreignKey: "user_id", as: "user" });

module.exports = {
  User,
  Collection,
  CustomField,
  CustomFieldValue,
  Item,
  Comment,
  Like,
  Tag,
  ItemTag,
};
