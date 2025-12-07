import frappe, json
def _upsert(doctype, name, doc):
    if frappe.db.exists(doctype, name):
        existing = frappe.get_doc(doctype, name)
        existing.update(doc)
        existing.save(ignore_permissions=True)
    else:
        frappe.get_doc(doc).insert(ignore_permissions=True)
    frappe.db.commit()

def execute():
    # Custom Field
    cf_doc = {
        "doctype": "Custom Field",
        "dt": "ToDo",
        "fieldname": "custom_project",
        "label": "Project",
        "fieldtype": "Link",
        "options": "Project",
        "insert_after": "description",
        "module": "frappe_project"
    }
    _upsert("Custom Field", "ToDo-custom_project", cf_doc)

    # Number Cards
    nc_open = {"doctype":"Number Card","name":"Projects: Open Projects","module":"frappe_project","label":"Open Projects","document_type":"Project","function":"Count","filters": json.dumps([["Project","status","=","Open"]])}
    nc_active = {"doctype":"Number Card","name":"Projects: Active Tasks","module":"frappe_project","label":"Active Tasks","document_type":"ToDo","function":"Count","filters": json.dumps([["ToDo","status","!=","Done"]])}
    nc_overdue = {"doctype":"Number Card","name":"Projects: Overdue Tasks","module":"frappe_project","label":"Overdue Tasks","document_type":"ToDo","function":"Count","filters": json.dumps([["ToDo","status","!=","Done"],["ToDo","date","<","today"]])}
    _upsert("Number Card", nc_open["name"], nc_open)
    _upsert("Number Card", nc_active["name"], nc_active)
    _upsert("Number Card", nc_overdue["name"], nc_overdue)

    # Chart
    chart_name = "Tasks Created vs Completed - Projects"
    chart_doc = {"doctype":"Chart","chart_name":chart_name,"module":"frappe_project","chart_type":"Line","document_type":"ToDo","timespan":"Last 30 Days","filters_json": json.dumps([["ToDo","custom_project","!=",""]])}
    _upsert("Chart", chart_name, chart_doc)

    # Workspace content (stringified)
    content = [
        {"id":"hdr","type":"header","data":{"text":"<span class=\"h4\">Projects</span>","col":12}},
        {"id":"nc1","type":"number_card","data":{"number_card_name":"Projects: Open Projects","col":3}},
        {"id":"nc2","type":"number_card","data":{"number_card_name":"Projects: Active Tasks","col":3}},
        {"id":"nc3","type":"number_card","data":{"number_card_name":"Projects: Overdue Tasks","col":3}},
        {"id":"chart1","type":"chart","data":{"chart_name": chart_name, "col":12}},
        {"id":"sc1","type":"shortcut","data":{"shortcut_name":"Project","col":3}},
        {"id":"sc2","type":"shortcut","data":{"shortcut_name":"ToDo","col":3}},
        {"id":"ql1","type":"quick_list","data":{"quick_list_name":"Open Tasks","col":4}},
        {"id":"ql2","type":"quick_list","data":{"quick_list_name":"Overdue Tasks","col":4}}
    ]

    workspace_name = "Projects"
    workspace_doc = {
        "doctype":"Workspace","name":workspace_name,"title":"Projects","label":"Projects","module":"frappe_project",
        "is_public":1,"sequence_id":10,"content": json.dumps(content, ensure_ascii=False),
        "number_cards":[{"label":"Open Projects","number_card_name":"Projects: Open Projects"},{"label":"Active Tasks","number_card_name":"Projects: Active Tasks"},{"label":"Overdue Tasks","number_card_name":"Projects: Overdue Tasks"}],
        "shortcuts":[{"label":"Project","type":"DocType","link_to":"Project","doc_view":"List","color":"Grey"},{"label":"ToDo","type":"DocType","link_to":"ToDo","doc_view":"List","color":"Grey"}],
        "quick_lists":[{"document_type":"ToDo","label":"Open Tasks","quick_list_filter": json.dumps([["ToDo","status","=","Open", False]])},{"document_type":"ToDo","label":"Overdue Tasks","quick_list_filter": json.dumps([["ToDo","status","=","Overdue", False]])}],
        "public":1,"roles":[]
    }

    if not frappe.db.exists("Workspace", workspace_name):
        frappe.get_doc(workspace_doc).insert(ignore_permissions=True)
    else:
        ws = frappe.get_doc("Workspace", workspace_name)
        ws.is_public = 1
        ws.content = json.dumps(content, ensure_ascii=False)
        ws.number_cards = workspace_doc["number_cards"]
        ws.shortcuts = workspace_doc["shortcuts"]
        ws.quick_lists = workspace_doc["quick_lists"]
        ws.public = 1
        ws.roles = []
        ws.save(ignore_permissions=True)

    frappe.db.commit()
    frappe.clear_cache()
