# https://community.home-assistant.io/t/how-can-a-custom-card-talk-to-a-custom-add-on/642984/15

import asyncio
import base64
import logging
from typing import Union
from urllib.parse import urlencode, urljoin
import json

import requests
from aiohttp import web
import voluptuous as vol
from homeassistant.components.camera import async_get_image
from homeassistant.components.hassio.ingress import _websocket_forward
from homeassistant.components.http import HomeAssistantView
from homeassistant.components.websocket_api import ActiveConnection
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.template import Template
from homeassistant.helpers.typing import HomeAssistantType, ConfigType, ServiceCallType
from homeassistant.components import websocket_api

_LOGGER = logging.getLogger(__name__)

_LOGGER.info("RUNNING!!!!")

DOMAIN = "super_scheduler"

async def async_setup(hass: HomeAssistantType, config: ConfigType):
    # 1. Serve lovelace card
    # path = Path(__file__).parent / "www"
    # for name in ("video-rtc.js", "webrtc-camera.js", "digital-ptz.js"):
    #     utils.register_static_path(hass.http.app, "/webrtc/" + name, path / name)
    #
    # # 2. Add card to resources
    # version = getattr(hass.data["integrations"][DOMAIN], "version", 0)
    # await utils.init_resource(hass, "/webrtc/webrtc-camera.js", str(version))
    #
    # # 3. Serve html page
    # path = Path(__file__).parent / "www/embed.html"
    # utils.register_static_path(hass.http.app, "/webrtc/embed", path)

    _LOGGER.info("setup")

    # 4. Serve WebSocket API
    hass.http.register_view(WebSocketView)

    # 6. Register webrtc.create_link and webrtc.dash_cast services:
    async def get_one_time_tasks(call: ServiceCallType):
        _LOGGER.info("get_one_time_tasks")

        return {
            "type": "success",
        }
        pass

    hass.services.async_register(DOMAIN, "get_one_time_tasks", get_one_time_tasks)
    hass.components.websocket_api.async_register_command(ws_proxy_http)

    return True

#
# async def async_setup_entry(hass: HomeAssistantType, entry: ConfigEntry):
#     return True


@websocket_api.websocket_command(
    {
        vol.Required("type"): "proxy-to-local-home-assistant-network/http",
        vol.Required("method"): str,
        vol.Required("url"): str,
        vol.Optional("headers"): dict,
        vol.Optional("data"): str,
    }
)
@websocket_api.async_response
async def ws_proxy_http(
        hass: HomeAssistant, connection: ActiveConnection, msg: dict
) -> None:
    response = None

    headers = msg["headers"] if "headers" in msg else {}

    if msg["method"] == "GET":
        response = await hass.async_add_executor_job(requests.get, msg["url"], headers=headers)
    elif msg["method"] == "POST":
        response = await hass.async_add_executor_job(requests.post, msg["url"], data=msg["data"], headers=headers)
    elif msg["method"] == "PUT":
        response = await hass.async_add_executor_job(requests.put, msg["url"], data=msg["data"], headers=headers)
    elif msg["method"] == "DELETE":
        response = await hass.async_add_executor_job(requests.delete, msg["url"], headers=headers)
    elif msg["method"] == "PATCH":
        response = await hass.async_add_executor_job(requests.patch, msg["url"], data=msg["data"], headers=headers)
    else:
        connection.send_error(
            msg["id"], "method_not_supported", "Method not supported"
        )
        return

    connection.send_result(
        msg["id"],
        {
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "content": response.content.decode("utf-8"),
        },
    )


class WebSocketView(HomeAssistantView):
    url = f"/api/{DOMAIN}/ws"
    name = f"api:{DOMAIN}:ws"
    requires_auth = False

    async def get(self, request: web.Request):
        _LOGGER.info("WebSocketView get")

        params = request.query
        _LOGGER.debug(f"New client: {dict(params)}")

        hass = request.app["hass"]

        # if "poster" in params:
        #     return await ws_poster(hass, params)

        ws_server = web.WebSocketResponse(autoclose=False, autoping=False)
        # ws_server.set_cookie(HLS_COOKIE, HLS_SESSION)
        await ws_server.prepare(request)

        await ws_server.send_json({
            "type": "data",
            "value": json.dumps(dict(params))
        })
        #
        # try:
        #     url = await ws_connect(hass, params)
        #
        #     remote = request.headers.get("X-Forwarded-For")
        #     remote = remote + ", " + request.remote if remote else request.remote
        #
        #     # https://www.nginx.com/resources/wiki/start/topics/examples/forwarded/
        #     async with async_get_clientsession(hass).ws_connect(
        #             url,
        #             autoclose=False,
        #             autoping=False,
        #             headers={
        #                 "User-Agent": request.headers.get("User-Agent"),
        #                 "X-Forwarded-For": remote,
        #                 "X-Forwarded-Host": request.host,
        #                 "X-Forwarded-Proto": request.scheme,
        #             },
        #     ) as ws_client:
        #         # Proxy requests
        #         await asyncio.wait(
        #             [
        #                 asyncio.create_task(_websocket_forward(ws_server, ws_client)),
        #                 asyncio.create_task(_websocket_forward(ws_client, ws_server)),
        #             ],
        #             return_when=asyncio.FIRST_COMPLETED,
        #         )
        #
        # except Exception as e:
        #     await ws_server.send_json({
        #         "type": "error",
        #         "value": str(e)
        #     })

        return ws_server
