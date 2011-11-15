%% -*- mode: erlang -*-
%% -*- erlang-indent-level: 4;indent-tabs-mode: nil -*-
%% ex: ts=4 sw=4 et
%% Copyright 2011 Benjamin Nortier
%%
%%   Licensed under the Apache License, Version 2.0 (the "License");
%%   you may not use this file except in compliance with the License.
%%   You may obtain a copy of the License at
%%
%%       http://www.apache.org/licenses/LICENSE-2.0
%%
%%   Unless required by applicable law or agreed to in writing, software
%%   distributed under the License is distributed on an "AS IS" BASIS,
%%   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
%%   See the License for the specific language governing permissions and
%%   limitations under the License.

-module(node_ref_resource).
-author('Benjamin Nortier <bjnortier@gmail.com>').
-export([
	 init/1, 
         allowed_methods/2,
	 content_types_provided/2,
	 provide_content/2,
         content_types_accepted/2,
         accept_content/2,
	 resource_exists/2,
         malformed_request/2
        ]).
-include_lib("webmachine/include/webmachine.hrl").

-record(context, {model, commit, newref}).

init([]) -> {ok, #context{model=undefined, commit=undefined, newref=undefined}}.

allowed_methods(ReqData, Context) -> 
    {['GET', 'PUT'], ReqData, Context}.

resource_exists(ReqData, Context) ->
    {ok, DB} = application:get_env(node, db_module),
    ModelKey = model_key(ReqData),
    RefKey = list_to_binary(wrq:path_info(ref, ReqData)),
    case DB:get(model, ModelKey) of
	undefined ->
	    {false, wrq:set_resp_body(jiffy:encode(<<"model not found">>), ReqData), Context};
	Model ->
	    {[{<<"refs">>, {Refs}}]} = jiffy:decode(Model),
	    case lists:keyfind(RefKey, 1, Refs) of
		{_, Commit} ->
		    {true, ReqData, Context#context{commit = Commit, model = Model}};
		false ->
		    {false, wrq:set_resp_body(jiffy:encode(<<"ref not found">>), ReqData), Context}
	    end
    end.

content_types_provided(ReqData, Context) ->
    {[{"application/json", provide_content}], ReqData, Context}.

provide_content(ReqData, Context) ->
    {jiffy:encode(Context#context.commit), ReqData, Context}.

content_types_accepted(ReqData, Context) ->
    {[{"application/json", accept_content}], ReqData, Context}.

accept_content(ReqData, Context) ->
    {ok, DB} = application:get_env(node, db_module),
    RefKey = list_to_binary(wrq:path_info(ref, ReqData)),

    {[{<<"refs">>, {Refs}}]} = jiffy:decode(Context#context.model),
    NewRefs = lists:keyreplace(RefKey, 1, Refs, {RefKey, Context#context.newref}),
    NewModel = {[{<<"refs">>, {NewRefs}}]},
    DB:put(model, model_key(ReqData), jiffy:encode(NewModel)),

    {true, wrq:set_resp_body(jiffy:encode(<<"updated">>), ReqData), Context}.

malformed_request(ReqData, Context) ->
    Method = wrq:method(ReqData),
    malformed_request(ReqData, Context, Method).

malformed_request(ReqData, Context, 'GET') ->
    {false, ReqData, Context};
malformed_request(ReqData, Context, 'PUT') ->
    Body = wrq:req_body(ReqData),
    try 
	JSON = jiffy:decode(iolist_to_binary(Body)),
	case is_binary(JSON) of
	    true ->
		{false, ReqData, Context#context{newref = JSON}};
	    false ->
		{true, wrq:set_resp_body(jiffy:encode(<<"only strings accepted">>), ReqData), Context}
	end
    catch
	A:B ->
	    lager:info("malformed request: ~p -> ~p:~p", [Body, A, B]),
	    {true, wrq:set_resp_body(jiffy:encode(<<"invalid JSON">>), ReqData), Context}
    end.


%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%                              PRIVATE                                     %%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

model_key(ReqData) ->
    User = wrq:path_info(user, ReqData),
    Model = wrq:path_info(model, ReqData),
    lists:flatten(User ++ "/" ++ Model).
