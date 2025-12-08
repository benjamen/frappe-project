frappe.ui.form.on('Project', {
    refresh: function(frm) {
        const section_fieldname = 'todo_section';
        const style_id = 'project-tasks-styles-left';

        // Inject scoped styles once
        if (!document.getElementById(style_id)) {
            const styles = `
                .project-tasks { margin-top: .25rem; }

                .project-tasks__title {
                    display: flex;
                    justify-content: space-between;
                    align-items: baseline;
                    margin: .25rem 0 .5rem;
                }
                .project-tasks__title .h6 {
                    margin: 0;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: .02em;
                    color: var(--text-muted, #6b7280);
                }
                .project-tasks__meta { font-size: 12px; color: var(--text-muted, #6b7280); }

                /* Shared grid: all left-aligned (Description, Allocated To, Priority, Status, Due) */
                .project-tasks__grid {
                    display: grid;
                    grid-template-columns: 5fr 3fr 2fr 2fr 2fr;
                    align-items: center;
                    gap: .5rem;
                }
                .project-tasks__cell {
                    min-width: 0;          /* enables ellipsis */
                    line-height: 1.25;      /* consistent baseline */
                    text-align: left;       /* left align everything */
                    white-space: nowrap;    /* prevent wrapping within cells */
                }
                .project-tasks__cell .indicator { vertical-align: middle; }

                /* Header */
                .project-tasks__head {
                    border-bottom: 1px solid var(--border-color, #e5e7eb);
                    padding: .375rem .25rem;
                }
                .project-tasks__head .project-tasks__cell {
                    font-weight: 600;
                    color: var(--text-color, #111827);
                    font-size: 12px;
                }

                /* Rows */
                .project-tasks__row {
                    padding: .5rem .25rem;
                    border-bottom: 1px solid var(--border-color, #eef2f7);
                }
                .project-tasks__row:last-child { border-bottom: 0; }

                /* Priority badge (compact, consistent height) */
                .project-tasks__badge {
                    display: inline-block;
                    background: #f3f4f6;
                    color: #374151;
                    border-radius: 10px;
                    padding: 2px 8px;
                    font-size: 11px;
                    line-height: 1.2;
                }

                /* Assignee pill */
                .project-tasks__assignee {
                    display: inline-block;
                    color: var(--text-color, #111827);
                    max-width: 100%;
                }

                /* Links */
                .project-tasks a { color: var(--text-color, #111827); text-decoration: none; }
                .project-tasks a:hover { text-decoration: underline; }

                /* Footer */
                .project-tasks__footer { margin-top: .5rem; text-align: right; }

                /* Empty state */
                .project-tasks__empty { margin: .5rem 0; color: var(--text-muted, #6b7280); font-size: 12px; }
            `;
            $('<style>', { id: style_id, html: styles }).appendTo('head');
        }

        // Ensure section
        if (!frm.fields_dict[section_fieldname]) {
            frm.add_section(__('Project Tasks'), section_fieldname);
            frm.add_custom_button(__('Project Tasks'), () => {
                frappe.set_route('List', 'ToDo', { 'custom_project': frm.doc.name });
            }, __('View'));
        } else {
            frm.set_df_property(section_fieldname, 'hidden', 0);
        }

        render_todos(frm, section_fieldname);

        function render_todos(frm, fieldname) {
            const $container = $(frm.fields_dict[fieldname].wrapper);

            $container.empty().html(`
                <div class="project-tasks list-view">
                    <div class="list-view-content">
                        <div class="project-tasks__title">
                            <div class="h6">${__('Project Tasks')}</div>
                            <div class="project-tasks__meta">${__('Loading…')}</div>
                        </div>
                        <div class="text-center text-muted">
                            <i class="fa fa-spinner fa-spin fa-fw"></i>
                        </div>
                    </div>
                </div>
            `);

            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "ToDo",
                    filters: {
                        "custom_project": frm.doc.name,
                        "docstatus": 0,
                        "status": ["!=", "Done"]
                    },
                    fields: ["name", "description", "status", "priority", "date", "allocated_to"],
                    order_by: "priority DESC, date ASC",
                    limit: 10
                },
                callback: function(r) {
                    const $content = $container.find('.list-view-content');
                    $content.empty();

                    const todos = (r.message || []).map(t => {
                        const description_text = frappe.utils.html2text
                            ? frappe.utils.html2text(t.description || '')
                            : $('<div>').html(t.description || '').text();
                        const due = t.date ? frappe.datetime.str_to_user(t.date) : '';
                        // Friendly assignee name if possible
                        let assignee = t.allocated_to || '';
                        try {
                            if (assignee && frappe.user_info) {
                                const info = frappe.user_info(assignee);
                                assignee = (info && info.full_name) ? info.full_name : assignee;
                            }
                        } catch (e) {
                            // fallback to raw value
                        }
                        return { ...t, description_text, due, assignee };
                    });

                    // Title with count and "View all"
                    $content.append(`
                        <div class="project-tasks__title">
                            <div class="h6">${__('Project Tasks')}</div>
                            <div class="project-tasks__meta">
                                ${todos.length} ${__('open')}
                                &nbsp;&middot;&nbsp;
                                <a class="small text-muted" href="/app/todo?custom_project=${encodeURIComponent(frm.doc.name)}">
                                    ${__('View all')}
                                </a>
                            </div>
                        </div>
                    `);

                    if (!todos.length) {
                        $content.append(`
                            <div class="project-tasks__empty">
                                ${__('No open ToDos linked to this project.')}
                                <a class="small" href="/app/todo/new?custom_project=${encodeURIComponent(frm.doc.name)}">
                                    ${__('Create a task')}
                                </a>
                            </div>
                        `);
                        return;
                    }

                    // Header (left-aligned)
                    $content.append(`
                        <div class="list-row project-tasks__head">
                            <div class="project-tasks__grid">
                                <div class="project-tasks__cell">${__('Description')}</div>
                                <div class="project-tasks__cell">${__('Allocated To')}</div>
                                <div class="project-tasks__cell">${__('Priority')}</div>
                                <div class="project-tasks__cell">${__('Status')}</div>
                                <div class="project-tasks__cell">${__('Due date')}</div>
                            </div>
                        </div>
                    `);

                    const indicatorColor = (status) => ({
                        'Open': 'orange',
                        'Priority': 'red',
                        'To Do': 'orange',
                        'In Progress': 'blue',
                        'Waiting': 'darkgrey'
                    }[status] || 'gray');

                    // Rows (left-aligned to match header)
                    todos.forEach(todo => {
                        const status_badge = `
                            <span class="indicator ${indicatorColor(todo.status)} indicator-sm">
                                ${frappe.utils.escape_html(todo.status || '')}
                            </span>
                        `;

                        $content.append(`
                            <div class="list-row project-tasks__row" data-name="${frappe.utils.escape_html(todo.name)}">
                                <div class="project-tasks__grid">
                                    <div class="project-tasks__cell ellipsis">
                                        <a href="/app/todo/${encodeURIComponent(todo.name)}"
                                           title="${frappe.utils.escape_html(todo.description_text)}">
                                            ${frappe.utils.escape_html(todo.description_text)}
                                        </a>
                                    </div>
                                    <div class="project-tasks__cell ellipsis">
                                        <span class="project-tasks__assignee" title="${frappe.utils.escape_html(todo.assignee || '')}">
                                            ${frappe.utils.escape_html(todo.assignee || '')}
                                        </span>
                                    </div>
                                    <div class="project-tasks__cell">
                                        <span class="project-tasks__badge">
                                            ${frappe.utils.escape_html(todo.priority || '')}
                                        </span>
                                    </div>
                                    <div class="project-tasks__cell">
                                        ${status_badge}
                                    </div>
                                    <div class="project-tasks__cell">
                                        ${frappe.utils.escape_html(todo.due)}
                                    </div>
                                </div>
                            </div>
                        `);
                    });

                    // Footer
                    $content.append(`
                        <div class="project-tasks__footer">
                            <a class="small" href="/app/todo?custom_project=${encodeURIComponent(frm.doc.name)}">
                                ${__('View all tasks')}
                            </a>
                        </div>
                    `);
                }
            });
        }
    }
});