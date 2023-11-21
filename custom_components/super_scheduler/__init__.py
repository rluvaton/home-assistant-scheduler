# https://community.home-assistant.io/t/how-can-a-custom-card-talk-to-a-custom-add-on/642984/15

import asyncio
import logging
from typing import Union
from urllib.parse import urlencode, urljoin
import json

from aiohttp import web
from homeassistant.components.camera import async_get_image
from homeassistant.components.hassio.ingress import _websocket_forward
from homeassistant.components.http import HomeAssistantView
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.template import Template
from homeassistant.helpers.typing import HomeAssistantType, ConfigType, ServiceCallType
# from homeassistant.core import (
#     SupportsResponse
# )

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

    return True

#
# async def async_setup_entry(hass: HomeAssistantType, entry: ConfigEntry):
#     return True


async def ws_connect(hass: HomeAssistantType, params: dict) -> str:
    _LOGGER.info("ws_connect")
    # 1. Server URL from card param
    server: str = params.get("server")
    # 2. Server URL from integration settings
    if not server:
        server: Union[str, Server] = hass.data[DOMAIN]
    # 3. Server is manual binary
    if isinstance(server, Server):
        assert server.available, "WebRTC server not available"
        server = "http://localhost:1984/"

    if name := params.get("entity"):
        src = await utils.get_stream_source(hass, name)
        assert src, f"Can't get URL for {name}"
        query = {"src": src, "name": name}
    elif src := params.get("url"):
        if "{{" in src or "{%" in src:
            src = Template(src, hass).async_render()
        query = {"src": src}
    else:
        raise Exception("Missing url or entity")

    return urljoin("ws" + server[4:], "api/ws") + "?" + urlencode(query)


async def ws_poster(hass: HomeAssistantType, params: dict) -> web.Response:
    _LOGGER.info("ws_poster")

    poster: str = params["poster"]

    if "{{" in poster or "{%" in poster:
        # support Jinja2 tempaltes inside poster
        poster = Template(poster, hass).async_render()

    if poster.startswith("camera."):
        # support entity_id as poster
        image = await async_get_image(hass, poster)
        return web.Response(body=image.content, content_type=image.content_type)

    # support poster from go2rtc stream name
    entry = hass.data[DOMAIN]
    url = "http://localhost:1984/" if isinstance(entry, Server) else entry
    url = urljoin(url, "api/frame.jpeg") + "?" + urlencode({"src": poster})

    async with async_get_clientsession(hass).get(url) as r:
        body = await r.read()
        return web.Response(body=body, content_type=r.content_type)


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
