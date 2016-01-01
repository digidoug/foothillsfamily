(function () {
    "use strict";
    /*
   hook up event handlers 
 */
    function register_event_handlers() {



        /* button  Button */
        $(document).on("click", ".uib_w_4", function (evt) {
            /* Other possible functions are: 
           uib_sb.open_sidebar($sb)
           uib_sb.close_sidebar($sb)
           uib_sb.toggle_sidebar($sb)
            uib_sb.close_all_sidebars()
          See js/sidebar.js for the full sidebar API */
            //$('#sidebar').slideToggle();
            //uib_sb.open_sidebar($('#sidebar'));

        });

        /* button  menubutton */


        /* listitem  Where are we? */



        /* button  menubutton */


        /* button  menubutton */


        /* listitem  Where are we? */


        /* listitem  Where are we? */


        /* listitem  Where are we? */


        /* listitem  Where are we? */


        /* button  menubutton */


        /* button  menubutton */


        /* listitem  How to Apply */


        /* listitem  How to Apply */
        $(document).on("click", ".uib_w_8", function (evt) {



            activate_subpage("#howtoapply");
        });

        /* listitem  homebutton */
        $(document).on("click", "#homebutton", function (evt) {
            activate_subpage("#page_17_94");
        });

        /* listitem  How to Apply */
        $(document).on("click", ".uib_w_8", function (evt) {
            /* your code goes here */
        });

        /* listitem  News */
        $(document).on("click", ".uib_w_13", function (evt) {
            activate_subpage("#news");
        });

        /* listitem  Contact Us */


        /* listitem  Contact Us */


        /* listitem  Contact Us */


        /* listitem  The FSD Blog */
        $(document).on("click", ".uib_w_23", function (evt) {
            activate_subpage("#blog");
        });

        /* listitem  {{title}} */


        /* button  menubutton */


        /* button  menubutton */


        /* button  menubutton */
        $(document).on("click", "#menubutton", function (evt) {
            /* Other possible functions are: 
           uib_sb.open_sidebar($sb)
           uib_sb.close_sidebar($sb)
           uib_sb.toggle_sidebar($sb)
            uib_sb.close_all_sidebars()
          See js/sidebar.js for the full sidebar API */

            uib_sb.toggle_sidebar($('#sidebar').css('left', '200'));
        });

        /* button  menubutton */
        $(document).on("click", "#menubutton", function (evt) {
            /* Other possible functions are: 
           uib_sb.open_sidebar($sb)
           uib_sb.close_sidebar($sb)
           uib_sb.toggle_sidebar($sb)
            uib_sb.close_all_sidebars()
          See js/sidebar.js for the full sidebar API */

            uib_sb.toggle_sidebar($("#sidebar"));
        });

        /* listitem  {{title}} */
        $(document).on("click", ".uib_w_22", function (evt) {
            activate_subpage("#readblog");
        });

        /* listitem  Contact Us */
        

        /* button  menubutton */
        $(document).on("click", "#menubutton", function (evt) {
            /* your code goes here */
        });

        /* listitem  Engaged Learners */
        $(document).on("click", ".uib_w_11", function (evt) {



        });

        /* listitem  Where are we? */
        $(document).on("click", ".uib_w_15", function (evt) {
            window.open('https://mapsengine.google.com/map/viewer?mid=zt-DN1mOFmAI.kew55zxmBAnM', '_blank', 'location=yes');
            /* your code goes here */
        });

        /* listitem  Student Voice */
    $(document).on("click", ".uib_w_9", function(evt)
    {
         activate_subpage("#stuvoice"); 
    });
    
        /* listitem  Engaged Learners */
    $(document).on("click", ".uib_w_11", function(evt)
    {
         activate_subpage("#englearn"); 
    });
    
        /* listitem  uib_w_12 */
    
    
        /* listitem  Diverse Programming */
    
    
        /* listitem  Diverse Programming */
    $(document).on("click", ".uib_w_12", function(evt)
    {
         activate_subpage("#wrprog"); 
    });
    
        /* listitem  diversesd */
    $(document).on("click", "#diversesd", function(evt)
    {
        /* your code goes here */ 
    });
    
        /* listitem  Wide-Ranging Programming */
    $(document).on("click", ".uib_w_39", function(evt)
    {
         activate_subpage("#wrprog"); 
    });
    
        /* listitem  Comprehensive Staff Dev. */
    $(document).on("click", ".uib_w_40", function(evt)
    {
         activate_subpage("#staffdev"); 
    });
    
        /* listitem  Contact Us */
    
    
        /* listitem  Contact Us */
    $(document).on("click", ".uib_w_14", function(evt)
    {
         activate_subpage("#newcontact"); 
    });
    
        /* listitem  Administrative */
    $(document).on("click", ".uib_w_45", function(evt)
    {
         activate_subpage("#admin"); 
    });
    
        /* listitem  Teaching */
    
    
        /* listitem  Guest Teaching */
    $(document).on("click", ".uib_w_48", function(evt)
    {
         activate_subpage("#guest"); 
    });
    
        /* listitem  Non Teaching */
    $(document).on("click", ".uib_w_47", function(evt)
    {
         activate_subpage("#nonteaching"); 
    });
    
        /* listitem  Teaching */
    $(document).on("click", ".uib_w_46", function(evt)
    {
         activate_subpage("#teaching"); 
    });
    
        /* listitem  About App */
    $(document).on("click", ".uib_w_61", function(evt)
    {
         /*global activate_subpage */
         activate_subpage("#aboutapp"); 
    });
    
    }
    document.addEventListener("app.Ready", register_event_handlers, false);
})();