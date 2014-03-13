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
        new_elements = document.querySelectorAll('*:not(.rebloguard-visited)');

        runnable_elements = [];

        for (var i = 0; i < new_elements.length; ++i) {
            element = new_elements[i];
            element.classList.add('rebloguard-visited');
            if (is_allowed(element)) {
                element.classList.add('.rebloguard-permitted');
                runnable_elements.push(element);
            } else {
                element.classList.add('.rebloguard-forbidden');
            }
        }

        runnable_elements.each(function(i, element) {
            run(element);
        });

        return runnable_elements;
    };

    // Run the scripts in an element
    var run = function(element) {
        // If it's a script, handle like a script
        if (element.nodeName == 'script') {
            if (!element.type || element.type == 'text/javascript') {
                schedule_script(element);
            }
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
        // FIXME do this --- but maybe Tumblr doesn't really do onclick etc.?
    };

    var is_allowed = function(element) {
        // ???
    };

    setTimeout(sweep, sweep_interval);
})();

