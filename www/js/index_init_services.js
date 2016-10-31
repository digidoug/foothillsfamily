/* --------------
 initialization 
  the xdkFilter argument can be set to a function that
   receives the data of the service method and can return alternate data
   thus you can reformat dates or names, remove or add entries, etc.
   -------------- */



data_support.ready(intel.xdk.services.fsdnews.bind(null, {"xdkFilter":null}));
data_support.ready(intel.xdk.services.blog.bind(null, {"xdkFilter":null}));
data_support.ready(intel.xdk.services.aboutus.bind(null, {
    "URL": "https://public-api.wordpress.com/rest/v1/sites/www.fsd38.ab.ca/posts/54",
    "xdkFilter": null
}));
data_support.ready(intel.xdk.services.contact.bind(null, {
    "xdkFilter": null
}));
data_support.ready(intel.xdk.services.studentvoice.bind(null, {
    "URL": "https://public-api.wordpress.com/rest/v1/sites/www.fsd38.ab.ca/posts/9135",
    "xdkFilter": null
}));
data_support.ready(intel.xdk.services.engagedlearners.bind(null, {"xdkFilter":null}));
data_support.ready(intel.xdk.services.widerange.bind(null, {"xdkFilter":null}));
data_support.ready(intel.xdk.services.staffdev.bind(null, {
    "URL": "https://public-api.wordpress.com/rest/v1/sites/www.fsd38.ab.ca/posts/9141",
    "xdkFilter": null
}));
data_support.ready(intel.xdk.services.newcontact.bind(null, {
    "xdkFilter": null
}));
data_support.ready(intel.xdk.services.guest.bind(null, {
    "xdkFilter": null
}));
data_support.ready(intel.xdk.services.nonteach.bind(null, {"xdkFilter":null}));
data_support.ready(intel.xdk.services.admin.bind(null, {
    "xdkFilter": null
}));
data_support.ready(intel.xdk.services.teach.bind(null, {"xdkFilter":null}));
data_support.ready(intel.xdk.services.stuvoice2.bind(null, {"xdkFilter":null}));
data_support.ready(intel.xdk.services.NewBlogFeed.bind(null, {"xdkFilter":null}));
data_support.ready(intel.xdk.services.NewStudentVoice.bind(null, {"xdkFilter":null}));
data_support.ready(intel.xdk.services.stuvoice.bind(null, {"xdkFilter":null}));