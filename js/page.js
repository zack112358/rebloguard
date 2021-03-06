// When we load a page in Tumblr, our init script has already set up content
// settings such that we won't actually run *any* JS on the page, not any at
// all.
//
// We need to go back through and execute the scripts that we actually want
// executed.
//
// The nice part of this is, although we are executing in the same namespace as
// the potential problem code, we know we get there first! So we can't be shot
// down before we begin. Furthermore we don't actually appear anywhere in the
// window.* namespace, so we should be fairly hard to find.

// Outer context holds only the execute() function. Inner function() will
// hold all other variables to prevent capture issues and exploits when we
// eval() scripts. Because a lot of JS is going to be run by eval, we can't
// actually hide this var from other code, so we'll just make it long.

var rebloguard_execute_contained_script_safely = function(text) {
    return eval(text);
};

(function() {

    // Extension manifest will load jQuery before we execute. Let's prevent
    // conflicts with Tumblr's JS by noconflicting out our version.
    var $ = jQuery.noConflict();

    // ms between checks for new scripts to run
    var sweep_interval = 200;
    // ms between checks if no new elements found last sweep
    var sweep_sleep_interval = 3000;

    var onEvents = [
        "onClick",
        "onAbort",
        "onBlur",
        "onChange",
        "onDblClick",
        "onDragDrop",
        "onError",
        "onFocus",
        "onKeyDown",
        "onKeyPress",
        "onKeyUp",
        "onLoad",
        "onMouseDown",
        "onMouseMove",
        "onMouseOut",
        "onMouseOver",
        "onMouseUp",
        "onMove",
        "onReset",
        "onResize",
        "onSelect",
        "onSubmit",
        "onUnload",
    ];

    // Find scripts to run and, should they be deemed valid, run them. Iterates
    // rapidly so that we hit new scripts as they load.
    // I started out using jQuery in this function, and then realized that was
    // probably a poor plan. Let's keep this as fast and Chrome-specific as
    // possible.
    var sweep = function(once) {
        runnable_elements = sweep_once();

        if (!once) {
            // We sleep longer if we didn't have anything to do this time.
            interval = runnable_elements.length? sweep_interval : sweep_sleep_interval;
            setTimeout(sweep, interval);
        }
    };

    var sweep_once = function() {
        new_banned_elements = find_new_banned_elements();

        for (var i = 0; i < new_elements.length; ++i) {
            new_banned_elements[i].classList.add('rebloguard-forbidden');
            new_banned_elements[i].classList.add('rebloguard-visited');
        }

        runnable_elements = document.querySelectorAll('*:not(.rebloguard-visited)');

        for (var i = 0; i < runnable_elements.length; ++i) {
            element = new_elements[i];
            element.classList.add('rebloguard-visited');
            element.classList.add('rebloguard-permitted');
            run(element);
        }

        return runnable_elements;
    };

    // Run the scripts in an element
    var run = function(element) {
        // If it's a script, handle like a script
        if (element.nodeName == 'script') {
            if (!element.type || element.type == 'text/javascript') {
                schedule_script(element);
            }
        } else if (element.nodeName == 'noscript') {
            remove_noscript(element);
        } else {
            restore_events(element);
        }
    };

    var script_queue = [];
    var next_script_index = 0;

    // We explicitly manage a queue of scripts to run because scripts are
    // supposed to be run in order. If all scripts were included inline this
    // wouldn't be an issue, but since we need to ajax some of them in we need
    // to manage the order by hand.
    var schedule_script = function(script) {
        script_queue.push(script);
        if (script.src) {
            script.textContent = ''; // Make sure existing textContent is falsy
            // FIXME jQuery usage
            $.ajax({
                'url': script.src,
                'error': function(jqxhr, stat, err) {
                    console.log("Error loading remote script " + script.src + ": " + stat + ", " + err);
                },
                'success': function(data, stat, jqxhr) {
                    // Once we receive data, we populate textContent and
                    // run_script_queue will detect that and execute
                    script.textContent = data;
                    run_script_queue();
                }
            });
        }
        else {
            run_script_queue();
        }
    };

    var remove_noscript = function(element) {
        element.remove();  // hah! We're on Chrome, so this works!
    }

    // See if there is any work to be done on the script queue; if so, do it
    var run_script_queue = function() {
        while (script_queue.length > next_script_index
               && script_queue[next_script_index].textContent)
        {
            rebloguard_execute_contained_script_safely(script_queue[next_script_index].textContent);
            next_script_index += 1;
        }
    };

    var restore_events = function(element) {
        // FIXME do this --- but maybe Tumblr doesn't really do onclick etc. in
        // the HTML? That would be good of them.
    };

    var find_new_banned_elements = function() {
        var runnable_selectors = [];

        /* My notes on Tumblr's content layout are as follows:
         *
         *  Dashboard doesn't matter because Tumblr filters JS, so we don't have
         *  to be very careful
         *  
         *  Dashboard path to user content
         *  html 
         *      body#dashboard_index.dashboard_index.logged_in.without_auto_paginate.is_dashboard.layout_standard
         *          div#container
         *              img.content_cap.content_top
         *              div#content
         *                  div#left_column.left_column
         *                      div#posts
         *                          ol#posts
         *                              li.post_container.new_post_buttons <-- not a user post!
         *                              li aslkjfhaslkhdf
         *                              <!-- START POSTS -->
         *                              li.post_container
         *                              li.post_container
         *                              <!-- END POSTS -->
         *              img.content_cap.content_bottom
         *
         *  Well, we can allow anything outside a li.post_container and I think we
         *  should be fine. But we need to allow the new-post buttons in the
         *  li.post_container.new_post_buttons, which makes it more annoying.
         */

        runnable_selectors.push(
            'body.dashboard_index *:not(.post_container *):not(.rebloguard-visited)');
        runnable_selectors.push(
            'body.dashboard_index li.post_container.new_post_buttons:not(.post_container *):not(.rebloguard-visited)');
        
        /*
         *
         *  Blog itself
         *  html
         *      body.regular.index-page.top
         *          section#page
         *              section#posts
         *                  article.text.not-page.post-[postnum]
         *
         *  Looks like we can just ban JS in articles. Nope, wait, the reblog
         *  buttons are children of the articles! Argh!
         *
         *  The post content is in
         *  article.text.not-page.post-[num]
         *      section.post
         *                      
         */

        runnable_selectors.push(
            'body.regular *:not(article .post *):not(.rebloguard-visited)');

        var runnable_elements = [];
        for (var i = 0; i < runnable_selectors.length; ++i) {
            runnable_elements = runnable_elements.concat(document.querySelectorAll(runnable_selectors[i]));
        }
        
        console.log(runnable_elements);
        return runnable_elements;
    };

    setTimeout(sweep, sweep_interval);
})();

