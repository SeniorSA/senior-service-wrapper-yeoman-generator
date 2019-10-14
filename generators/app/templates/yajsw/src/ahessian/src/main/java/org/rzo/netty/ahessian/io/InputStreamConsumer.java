/*******************************************************************************
 * Copyright  2015 rzorzorzo@users.sf.net
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *******************************************************************************/
package org.rzo.netty.ahessian.io;

import io.netty.channel.ChannelHandlerContext;

import java.io.InputStream;

public interface InputStreamConsumer
{
	public void consume(ChannelHandlerContext ctx, InputStream message);

	public boolean isBufferEmpty();

	public void setContext(ChannelHandlerContext ctx);

}
