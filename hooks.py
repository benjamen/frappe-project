app_name = "frappe_project"
app_title = "Frappe Project"
app_publisher = "Benjamen"
app_description = "Lightweight project management app for Frappe"
app_email = "you@example.com"
app_license = "MIT"

fixtures = [
    {
        "doctype": "Custom Field",
        "filters": [["dt", "=", "ToDo"], ["fieldname", "=", "custom_project"]],
    },
    {
        "doctype": "Workspace",
        "filters": [["module", "=", "Frappe Project"]],
    },
    {
        "doctype": "Number Card",
        "filters": [["module", "=", "Frappe Project"]],
    },
    {
        "doctype": "Dashboard Chart",
        "filters": [["module", "=", "Frappe Project"]],
    },
    {
        "doctype": "Dashboard",
        "filters": [["module", "=", "Frappe Project"]],
    },
]


app_include_js = ["assets/frappe_project/project_tasks.js"]
