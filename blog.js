const express = require("express");
const multer = require("multer");
const path = require("path");
const blog = require("./database/models/blog.model.js");
const { Op } = require("sequelize");
const del = require("del");
const defaultImg = path.join(
  process.cwd(),
  "public/uploads/blogs/default-default.jpg"
);

function processTitle(title) {
  title = title.toLowerCase().trim();
  let arr = title.split(" ");
  title = arr.join("-");
  return title;
}

let route = express.Router();
let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), "public/uploads/blogs"));
  },
  filename: function (req, file, cb) {
    let extension = path.extname(file.originalname);
    cb(null, "blog-" + Date.now().toString() + extension);
  },
});

let upload = multer({ storage: storage });

route.post("/", upload.any(), async (req, res, next) => {
  try {
    req.body.url = processTitle(req.body.title);
    if (blog.count({ where: { url: { [Op.eq]: req.body.url } } }) > 0) {
      res.json({
        success: false,
        message: "Blog with same title exists",
      });
    }
    let file = req.files ? req.files[0] : undefined;
    if (!file) {
      file = {
        path: defaultImg,
      };
    }
    let data = {
      title: req.body.title,
      description: req.body.desc,
      url: req.body.url,
      img: file.path,
      content: req.body.content,
    };
    await blog.create(data);
    res.redirect("blog/admin/home");
  } catch (err) {
    next(err);
  }
});

route.get("/:url", async (req, res, next) => {
  try {
    let data = await blog.findByPk(req.params.url);
    if (data) {
      res.render("blog", { data });
    } else {
      res.json({
        success: false,
        blog: null,
      });
    }
  } catch (err) {
    next(err);
  }
});

route.post("/edited/:url", upload.any(), async (req, res, next) => {
  try {
    let data = await blog.findByPk(req.params.url);
    if (data) {
      if (req.files) {
        if (data.img != defaultImg) {
          del.sync(data.img);
          data.img = req.files[0].path;
        }
      }
      data.content = req.body.content || data.content;
      data.title = req.body.title || data.title;
      data.description = req.body.description || data.description;
      await blog.update(data, { where: { url: { [Op.eq]: req.params.url } } });
      res.redirect("/blog/admin/home");
    } else {
      res.json({
        success: false,
        blog: null,
      });
    }
  } catch (err) {
    next(err);
  }
});

route.get("/admin/delete/:url", async (req, res, next) => {
  try {
    let data = await blog.findByPk(req.params.url);
    if (data) {
      let x = await blog.destroy({
        where: { url: { [Op.eq]: req.params.url } },
      });
      if (data.img != defaultImg) {
        del.sync(data.img);
      }
    }
    res.redirect("/blog/admin/home");
  } catch (err) {
    next(err);
  }
});

route.get("/admin/edit/:url", async (req, res, next) => {
  try {
    let data = await blog.findByPk(req.params.url);
    if (data) {
      res.render("admin-edit-blog", { data });
    } else {
      res.json({
        success: false,
        blog: null,
      });
    }
  } catch (err) {
    next(err);
  }
});

route.get("/admin/home", async (req, res, next) => {
  try {
    let data = await blog.findAll({
      attributes: ["title", "createdAt", "url"],
    });
    res.render("admin-blog-home", { data });
  } catch (err) {
    next(err);
  }
});

route.get("/admin/add", async (req, res, next) => {
  res.render("admin-add-blog");
});

module.exports = route;
