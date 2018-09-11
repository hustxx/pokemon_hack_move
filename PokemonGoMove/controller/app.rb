require 'sinatra'

set :bind, '0.0.0.0'
set :port, 3001
set :public_folder, Proc.new { File.join(root, "public") }

def distance loc1, loc2
  rad_per_deg = Math::PI/180  # PI / 180
  rkm = 6371                  # Earth radius in kilometers
  rm = rkm * 1000             # Radius in meters

  dlat_rad = (loc2[0]-loc1[0]) * rad_per_deg  # Delta, converted to rad
  dlon_rad = (loc2[1]-loc1[1]) * rad_per_deg

  lat1_rad, lon1_rad = loc1.map {|i| i * rad_per_deg }
  lat2_rad, lon2_rad = loc2.map {|i| i * rad_per_deg }

  a = Math.sin(dlat_rad/2)**2 + Math.cos(lat1_rad) * Math.cos(lat2_rad) * Math.sin(dlon_rad/2)**2
  c = 2 * Math::atan2(Math::sqrt(a), Math::sqrt(1-a))

  rm * c # Delta in meters
end

get '/' do
  erb :index
end

post '/update' do
  lat = params[:lat]
  lon = params[:lon]

  raw = %(<gpx creator="Xcode" version="1.1"><wpt lat="#{lat}" lon="#{lon}"><name>PokemonLocation</name></wpt></gpx>)
  File.open('PokemonLocation.gpx', 'w') do |f|
    f.puts raw
  end
  system('osascript click-event.scpt')
  'ok'
end

post '/multi_update' do
  speed = params[:speed]
  multi_dest = params[:mdest]
  @dest_array = JSON.parse(multi_dest)

  cur_time = Time.now
  inc_time = 0

  head = %(<gpx creator="Xcode" version="1.1">)
  tail = %(</gpx>)

  File.open('PokemonLocation.gpx', 'w') do |f|
    sp = %(<!-- speed: #{speed}\n-->)
    f.puts sp
    pre_loc = [@dest_array[0]['lat'], @dest_array[0]['lng']]

    f.puts head
    @dest_array.each do |v|
        cur_loc = [v['lat'], v['lng']]
        dis = distance pre_loc,cur_loc
        pre_loc = cur_loc

        inc_time = dis / speed.to_f;
        cur_time = cur_time + inc_time.to_i
        new_time = cur_time.utc.iso8601

        raw = %(<wpt lat="#{v['lat']}" lon="#{v['lng']}">\n\t<time>#{new_time}</time>\n</wpt>)
        f.puts raw
    end
    f.puts tail
  end
  system('osascript click-event.scpt')
  'ok'
end
